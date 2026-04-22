import { UserRole } from '../entities/user.entity';
export declare class UserResponseDto {
    id: string;
    username: string;
    email: string;
    fullName: string;
    coins: number;
    isPremium: boolean;
    role: UserRole;
    premiumExpiresAt?: Date;
    profilePhoto?: string;
    constructor(user?: any);
}
export declare class MinimalUserDto {
    id: number;
    username: string;
    constructor(user: any);
}
export declare class UserProfileDto extends UserResponseDto {
    bio?: string;
    avatar?: string;
    phone?: string;
    totalAds?: number;
    memberSince?: Date;
    constructor(user: any);
}
