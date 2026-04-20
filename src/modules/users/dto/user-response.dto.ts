import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

/**
 * User Profile Response DTO
 * Backend is the single source of truth for coins and premium status
 * Frontend must NEVER calculate or modify these values
 */
export class UserResponseDto {
  @ApiProperty({ description: 'User unique ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'Full name' })
  fullName: string;

  @ApiProperty({ description: 'Coin balance - backend source of truth', example: 5000 })
  coins: number;

  @ApiProperty({ description: 'Premium status - calculated by backend', example: true })
  isPremium: boolean;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'Premium expiration date', required: false })
  premiumExpiresAt?: Date;

  @ApiProperty({ description: 'Profile photo URL', required: false })
  profilePhoto?: string;

  constructor(user?: any) {
    if (user) {
      this.id = user.id;
      this.username = user.username;
      this.email = user.email;
      this.fullName = user.fullName;
      this.coins = user.coins;
      this.isPremium = user.isPremium;
      this.role = user.role;
      this.premiumExpiresAt = user.premiumExpiresAt;
      this.profilePhoto = user.profilePhoto;
    }
  }
}

/**
 * Minimal User DTO
 * For cases where only basic info is needed (comments, messages, etc.)
 */
export class MinimalUserDto {
  id: number;
  username: string;

  constructor(user: any) {
    this.id = user.id;
    this.username = user.username;
  }
}

/**
 * User Profile DTO
 * For detailed profile view
 */
export class UserProfileDto extends UserResponseDto {
  bio?: string;
  avatar?: string;
  phone?: string;
  totalAds?: number;
  memberSince?: Date;

  constructor(user: any) {
    super(user);
    this.bio = user.bio;
    this.avatar = user.avatar;
    this.phone = user.phone;
    this.totalAds = user.totalAds;
    this.memberSince = user.createdAt;
  }
}
