"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const user_entity_1 = require("../users/entities/user.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
let AuthService = class AuthService {
    constructor(usersRepository, refreshTokenRepository, jwtService) {
        this.usersRepository = usersRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_DURATION_MINUTES = 15;
        this.REFRESH_TOKEN_EXPIRY_DAYS = 30;
    }
    async register(registerDto) {
        const { email, password, fullName, age, location, referralCode } = registerDto;
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await this.usersRepository.findOne({
            where: { email: normalizedEmail },
        });
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const baseUsername = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;
        while (await this.usersRepository.findOne({ where: { username } })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const userReferralCode = this.generateReferralCode();
        let referredBy = null;
        if (referralCode) {
            const referrer = await this.usersRepository.findOne({
                where: { referralCode: referralCode.toUpperCase().trim() },
            });
            if (referrer) {
                referredBy = referrer.id;
                referrer.coins += 50;
                referrer.referralCount += 1;
                referrer.referralEarnings += 50;
                await this.usersRepository.save(referrer);
            }
        }
        const user = this.usersRepository.create({
            email: normalizedEmail,
            password: hashedPassword,
            fullName: fullName.trim(),
            username,
            age,
            location: location.trim(),
            referralCode: userReferralCode,
            referredBy,
            coins: referredBy ? 50 : 0,
            role: user_entity_1.UserRole.USER,
            trustScore: 50,
            isEmailVerified: false,
        });
        await this.usersRepository.save(user);
        const tokens = await this.generateTokens(user);
        return {
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    async login(loginDto, ipAddress, userAgent) {
        const { email, password } = loginDto;
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.usersRepository.findOne({
            where: { email: normalizedEmail }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.lockedUntil && new Date() < user.lockedUntil) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new common_1.UnauthorizedException(`Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.handleSuccessfulLogin(user);
        const tokens = await this.generateTokens(user, ipAddress, userAgent);
        return {
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    async handleFailedLogin(user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
            user.failedLoginAttempts = 0;
        }
        await this.usersRepository.save(user);
    }
    async handleSuccessfulLogin(user) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        await this.usersRepository.save(user);
    }
    async validateUser(email, password) {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    }
    async getUserById(id) {
        return this.usersRepository.findOne({ where: { id } });
    }
    async generateTokens(user, ipAddress, userAgent) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);
        const refreshTokenPayload = { ...payload, type: 'refresh' };
        const refreshToken = this.jwtService.sign(refreshTokenPayload, {
            expiresIn: `${this.REFRESH_TOKEN_EXPIRY_DAYS}d`
        });
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
    async refreshAccessToken(refreshTokenDto, ipAddress) {
        const { refreshToken } = refreshTokenDto;
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const hashedToken = this.hashToken(refreshToken);
        const storedToken = await this.refreshTokenRepository.findOne({
            where: { token: hashedToken, isRevoked: false },
            relations: ['user'],
        });
        if (!storedToken) {
            throw new common_1.UnauthorizedException('Refresh token has been revoked or does not exist');
        }
        if (new Date() > storedToken.expiresAt) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        storedToken.lastUsedAt = new Date();
        await this.refreshTokenRepository.save(storedToken);
        const user = storedToken.user;
        const newPayload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(newPayload);
        return { accessToken };
    }
    async logout(refreshToken) {
        if (!refreshToken) {
            throw new common_1.BadRequestException('Refresh token is required for logout');
        }
        const hashedToken = this.hashToken(refreshToken);
        const storedToken = await this.refreshTokenRepository.findOne({
            where: { token: hashedToken },
        });
        if (!storedToken) {
            return {
                message: 'Logged out successfully',
                success: true
            };
        }
        if (storedToken.isRevoked) {
            return {
                message: 'Token already revoked',
                success: true
            };
        }
        storedToken.isRevoked = true;
        storedToken.revokedAt = new Date();
        await this.refreshTokenRepository.save(storedToken);
        return {
            message: 'Logged out successfully from this device',
            success: true
        };
    }
    async logoutAllDevices(userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
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
        const result = await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true, revokedAt: new Date() });
        return {
            message: `Logged out from ${activeTokens.length} device(s) successfully`,
            devicesLoggedOut: result.affected || 0
        };
    }
    async logoutDevice(userId, tokenId) {
        if (!userId || !tokenId) {
            throw new common_1.BadRequestException('User ID and token ID are required');
        }
        const token = await this.refreshTokenRepository.findOne({
            where: {
                id: tokenId,
                userId: userId
            },
        });
        if (!token) {
            throw new common_1.NotFoundException('Session not found or does not belong to this user');
        }
        if (token.isRevoked) {
            return {
                message: 'Session already logged out',
                success: true
            };
        }
        token.isRevoked = true;
        token.revokedAt = new Date();
        await this.refreshTokenRepository.save(token);
        return {
            message: 'Device logged out successfully',
            success: true
        };
    }
    async getActiveSessions(userId) {
        const sessions = await this.refreshTokenRepository.find({
            where: {
                userId,
                isRevoked: false
            },
            order: { lastUsedAt: 'DESC' },
        });
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
    async cleanupExpiredTokens() {
        const result = await this.refreshTokenRepository.delete({
            expiresAt: (0, typeorm_2.LessThan)(new Date()),
        });
        return { deletedCount: result.affected || 0 };
    }
    async requestPasswordReset(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.usersRepository.findOne({
            where: { email: normalizedEmail },
        });
        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = this.hashToken(resetToken);
            const expiryDate = new Date();
            expiryDate.setMinutes(expiryDate.getMinutes() + 15);
            user.resetToken = hashedToken;
            user.resetTokenExpiry = expiryDate;
            await this.usersRepository.save(user);
            console.log(`Password reset token for ${email}: ${resetToken}`);
            console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);
        }
        return {
            message: 'If an account with that email exists, a password reset link has been sent',
            success: true,
        };
    }
    async resetPassword(token, newPassword) {
        const hashedToken = this.hashToken(token);
        const user = await this.usersRepository.findOne({
            where: {
                resetToken: hashedToken,
            },
        });
        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await this.usersRepository.save(user);
        await this.refreshTokenRepository.update({ userId: user.id, isRevoked: false }, { isRevoked: true, revokedAt: new Date() });
        return {
            message: 'Password has been reset successfully. Please login with your new password.',
            success: true,
        };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    sanitizeUser(user) {
        const { password, ...result } = user;
        return result;
    }
    generateReferralCode() {
        return 'USER' + Math.floor(1000 + Math.random() * 9000);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map