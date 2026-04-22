import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto/auth.dto';
export declare class AuthService {
    private usersRepository;
    private refreshTokenRepository;
    private jwtService;
    private readonly MAX_LOGIN_ATTEMPTS;
    private readonly LOCKOUT_DURATION_MINUTES;
    private readonly REFRESH_TOKEN_EXPIRY_DAYS;
    constructor(usersRepository: Repository<User>, refreshTokenRepository: Repository<RefreshToken>, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto>;
    private handleFailedLogin;
    private handleSuccessfulLogin;
    validateUser(email: string, password: string): Promise<User | null>;
    getUserById(id: string): Promise<User>;
    private generateTokens;
    refreshAccessToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string): Promise<{
        accessToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
        success: boolean;
    }>;
    logoutAllDevices(userId: string): Promise<{
        message: string;
        devicesLoggedOut: number;
    }>;
    logoutDevice(userId: string, tokenId: string): Promise<{
        message: string;
        success: boolean;
    }>;
    getActiveSessions(userId: string): Promise<{
        id: string;
        deviceInfo: string;
        ipAddress: string;
        createdAt: Date;
        lastUsedAt: Date;
        expiresAt: Date;
    }[]>;
    cleanupExpiredTokens(): Promise<{
        deletedCount: number;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
        success: boolean;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
        success: boolean;
    }>;
    private hashToken;
    private sanitizeUser;
    private generateReferralCode;
}
