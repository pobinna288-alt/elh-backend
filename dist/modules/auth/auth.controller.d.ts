import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto, PasswordResetRequestDto, PasswordResetConfirmDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<AuthResponseDto>;
    refresh(refreshTokenDto: RefreshTokenDto, ipAddress: string): Promise<{
        accessToken: string;
    }>;
    logout(refreshTokenDto: RefreshTokenDto): Promise<{
        message: string;
        success: boolean;
    }>;
    logoutAll(req: any): Promise<{
        message: string;
        devicesLoggedOut: number;
    }>;
    logoutDevice(req: any, tokenId: string): Promise<{
        message: string;
        success: boolean;
    }>;
    getActiveSessions(req: any): Promise<{
        id: string;
        deviceInfo: string;
        ipAddress: string;
        createdAt: Date;
        lastUsedAt: Date;
        expiresAt: Date;
    }[]>;
    requestPasswordReset(passwordResetRequestDto: PasswordResetRequestDto): Promise<{
        message: string;
        success: boolean;
    }>;
    resetPassword(passwordResetConfirmDto: PasswordResetConfirmDto): Promise<{
        message: string;
        success: boolean;
    }>;
}
