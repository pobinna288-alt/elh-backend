import { User } from '../../users/entities/user.entity';
export declare class RefreshToken {
    id: string;
    userId: string;
    user: User;
    token: string;
    deviceInfo: string;
    ipAddress: string;
    expiresAt: Date;
    isRevoked: boolean;
    createdAt: Date;
    revokedAt: Date;
    lastUsedAt: Date;
}
