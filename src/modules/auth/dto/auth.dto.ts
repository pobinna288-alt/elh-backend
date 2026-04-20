import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Match } from '../../../common/validators/match.validator';
import { IsStrongPassword } from '../../../common/validators/password-strength.validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ 
    example: 'SecurePass123!', 
    description: 'Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword({ message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number' })
  password: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password confirmation' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiProperty({ example: 25, description: 'User age (minimum 13)', minimum: 13, maximum: 120 })
  @IsNumber({}, { message: 'Age must be a valid number' })
  @Min(13, { message: 'You must be at least 13 years old to register' })
  @Max(120, { message: 'Please provide a valid age' })
  age: number;

  @ApiProperty({ example: 'New York, NY', description: 'User location/city' })
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @ApiProperty({ example: 'REF123', required: false, description: 'Optional referral code' })
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: any;
}

export class PasswordResetRequestDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class PasswordResetConfirmDto {
  @ApiProperty({ example: 'abc123token', description: 'Password reset token from email' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ 
    example: 'NewSecurePass123!', 
    description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword({ message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number' })
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePass123!', description: 'Password confirmation' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword: string;
}
