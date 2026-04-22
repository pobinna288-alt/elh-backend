export declare class RegisterDto {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    age: number;
    location: string;
    referralCode?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: any;
}
export declare class PasswordResetRequestDto {
    email: string;
}
export declare class PasswordResetConfirmDto {
    token: string;
    newPassword: string;
    confirmPassword: string;
}
