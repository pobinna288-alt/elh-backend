import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  // Security constants
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, fullName, age, location, referralCode } = registerDto;

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (case-insensitive)
    const existingUser = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Generate unique username from email
    const baseUsername = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    while (await this.usersRepository.findOne({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Hash password with bcrypt (cost factor 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique referral code
    const userReferralCode = this.generateReferralCode();

    // Handle referral (if provided)
    let referredBy = null;
    if (referralCode) {
      const referrer = await this.usersRepository.findOne({
        where: { referralCode: referralCode.toUpperCase().trim() },
      });
      if (referrer) {
        referredBy = referrer.id;
        // Award referral bonus to referrer
        referrer.coins += 50;
        referrer.referralCount += 1;
        referrer.referralEarnings += 50;
        await this.usersRepository.save(referrer);
      }
      // Note: Invalid referral codes are silently ignored (no error thrown)
    }

    // Create new user
    const user = this.usersRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      username,
      age,
      location: location.trim(),
      referralCode: userReferralCode,
      referredBy,
      coins: referredBy ? 50 : 0, // Bonus coins if referred
      role: UserRole.USER,
      trustScore: 50,
      isEmailVerified: false, // Prepared for future email verification
    });

    await this.usersRepository.save(user);

    // Generate JWT tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Normalize email for lookup
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.usersRepository.findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (!user) {
      // Generic error to prevent account enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await this.handleSuccessfulLogin(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Handle failed login attempt - increment counter and lock if needed
   */
  private async handleFailedLogin(user: User): Promise<void> {
    user.failedLoginAttempts += 1;

    // Lock account after max attempts
    if (user.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0; // Reset counter after locking
    }

    await this.usersRepository.save(user);
  }

  /**
   * Handle successful login - reset counters and update last login
   */
  private async handleSuccessfulLogin(user: User): Promise<void> {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async getUserById(id: string): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }

  private async generateTokens(user: User, ipAddress?: string, userAgent?: string) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token (30 days) - use longer expiry with separate secret
    const refreshTokenPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, { 
      expiresIn: `${this.REFRESH_TOKEN_EXPIRY_DAYS}d` 
    });

    // Store refresh token in database with device info
    const hashedRefreshToken = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.refreshTokenRepository.save({
      userId: user.id,
      token: hashedRefreshToken,
      deviceInfo: userAgent || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
      isRevoked: false,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string): Promise<{ accessToken: string }> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if token exists in database and is not revoked
    const hashedToken = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken, isRevoked: false },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token has been revoked or does not exist');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Update last used timestamp
    storedToken.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    // Generate new access token
    const user = storedToken.user;
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(newPayload);

    return { accessToken };
  }

  /**
   * Logout from current device - revoke specific refresh token
   * This method only revokes the provided token, leaving other devices active
   */
  async logout(refreshToken: string): Promise<{ message: string; success: boolean }> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required for logout');
    }

    // Hash token for database lookup
    const hashedToken = this.hashToken(refreshToken);
    
    // Find token in database
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken },
    });

    if (!storedToken) {
      // Token doesn't exist - might already be deleted or never created
      // Return success anyway (idempotent operation)
      return { 
        message: 'Logged out successfully', 
        success: true 
      };
    }

    // Check if already revoked
    if (storedToken.isRevoked) {
      return { 
        message: 'Token already revoked', 
        success: true 
      };
    }

    // Revoke the token
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    return { 
      message: 'Logged out successfully from this device', 
      success: true 
    };
  }

  /**
   * Logout from all devices - revoke all refresh tokens for a user
   * This method revokes ALL tokens, forcing re-login on all devices
   * Use when: account compromised, password changed, security breach suspected
   */
  async logoutAllDevices(userId: string): Promise<{ message: string; devicesLoggedOut: number }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    // Find all active (non-revoked) tokens for the user
    const activeTokens = await this.refreshTokenRepository.find({
      where: { 
        userId, 
        isRevoked: false 
      },
    });

    if (activeTokens.length === 0) {
      return { 
        message: 'No active sessions found',
        devicesLoggedOut: 0 
      };
    }

    // Revoke all tokens
    const result = await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    return { 
      message: `Logged out from ${activeTokens.length} device(s) successfully`,
      devicesLoggedOut: result.affected || 0
    };
  }

  /**
   * Logout from specific device by token ID
   * Allows users to manage their sessions and logout suspicious devices
   */
  async logoutDevice(userId: string, tokenId: string): Promise<{ message: string; success: boolean }> {
    if (!userId || !tokenId) {
      throw new BadRequestException('User ID and token ID are required');
    }

    // Find token by ID and verify it belongs to the user
    const token = await this.refreshTokenRepository.findOne({
      where: { 
        id: tokenId,
        userId: userId 
      },
    });

    if (!token) {
      throw new NotFoundException('Session not found or does not belong to this user');
    }

    if (token.isRevoked) {
      return { 
        message: 'Session already logged out', 
        success: true 
      };
    }

    // Revoke the token
    token.isRevoked = true;
    token.revokedAt = new Date();
    await this.refreshTokenRepository.save(token);

    return { 
      message: 'Device logged out successfully', 
      success: true 
    };
  }

  /**
   * Get active sessions for a user
   * Returns list of all active devices with their details
   */
  async getActiveSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: { 
        userId, 
        isRevoked: false
      },
      order: { lastUsedAt: 'DESC' },
    });

    // Filter out expired tokens
    const now = new Date();
    const activeSessions = sessions.filter(session => session.expiresAt > now);

    return activeSessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo || 'Unknown Device',
      ipAddress: session.ipAddress || 'Unknown IP',
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt || session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  /**
   * Clean up expired refresh tokens (scheduled job)
   * Removes expired tokens from database to keep it clean
   */
  async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return { deletedCount: result.affected || 0 };
  }

  /**
   * Request password reset
   * Generates one-time reset token with 15-minute expiry
   * Always returns success to prevent user enumeration attacks
   */
  async requestPasswordReset(email: string): Promise<{ message: string; success: boolean }> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    // If user exists, generate reset token
    if (user) {
      // Generate secure random token (32 bytes = 64 hex characters)
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing in database (SHA-256)
      const hashedToken = this.hashToken(resetToken);

      // Set expiry to 15 minutes from now
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);

      // Save hashed token and expiry to database
      user.resetToken = hashedToken;
      user.resetTokenExpiry = expiryDate;
      await this.usersRepository.save(user);

      // TODO: Send email with reset link containing the unhashed token
      // Example: https://elhannora.com/reset-password?token=${resetToken}
      // For now, we'll just log it (REMOVE THIS IN PRODUCTION)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);
    }

    // Always return success to prevent user enumeration
    // Don't reveal if email exists or not
    return {
      message: 'If an account with that email exists, a password reset link has been sent',
      success: true,
    };
  }

  /**
   * Reset password with token
   * Validates token and updates password
   * One-time use only (token invalidated after use)
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string; success: boolean }> {
    // Hash the provided token to compare with database
    const hashedToken = this.hashToken(token);

    // Find user with matching token that hasn't expired
    const user = await this.usersRepository.findOne({
      where: {
        resetToken: hashedToken,
      },
    });

    // Validate token exists and hasn't expired
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and invalidate reset token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    // Reset failed login attempts (fresh start)
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.usersRepository.save(user);

    // Invalidate all existing refresh tokens (logout from all devices)
    await this.refreshTokenRepository.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    return {
      message: 'Password has been reset successfully. Please login with your new password.',
      success: true,
    };
  }

  /**
   * Hash token for storage (one-way hash)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }

  private generateReferralCode(): string {
    return 'USER' + Math.floor(1000 + Math.random() * 9000);
  }
}
