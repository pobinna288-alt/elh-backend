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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetConfirmDto = exports.PasswordResetRequestDto = exports.AuthResponseDto = exports.RefreshTokenDto = exports.LoginDto = exports.RegisterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const match_validator_1 = require("../../../common/validators/match.validator");
const password_strength_validator_1 = require("../../../common/validators/password-strength.validator");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'User full name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Full name is required' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john@example.com', description: 'User email address' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'SecurePass123!',
        description: 'Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
        minLength: 8
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password is required' }),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters long' }),
    (0, password_strength_validator_1.IsStrongPassword)({ message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SecurePass123!', description: 'Password confirmation' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password confirmation is required' }),
    (0, match_validator_1.Match)('password', { message: 'Passwords do not match' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "confirmPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25, description: 'User age (minimum 13)', minimum: 13, maximum: 120 }),
    (0, class_validator_1.IsNumber)({}, { message: 'Age must be a valid number' }),
    (0, class_validator_1.Min)(13, { message: 'You must be at least 13 years old to register' }),
    (0, class_validator_1.Max)(120, { message: 'Please provide a valid age' }),
    __metadata("design:type", Number)
], RegisterDto.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'New York, NY', description: 'User location/city' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Location is required' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'REF123', required: false, description: 'Optional referral code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "referralCode", void 0);
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john@example.com', description: 'User email address' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SecurePass123!', description: 'User password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password is required' }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Refresh token is required' }),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class AuthResponseDto {
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], AuthResponseDto.prototype, "user", void 0);
class PasswordResetRequestDto {
}
exports.PasswordResetRequestDto = PasswordResetRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john@example.com', description: 'User email address' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    __metadata("design:type", String)
], PasswordResetRequestDto.prototype, "email", void 0);
class PasswordResetConfirmDto {
}
exports.PasswordResetConfirmDto = PasswordResetConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'abc123token', description: 'Password reset token from email' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Reset token is required' }),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'NewSecurePass123!',
        description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
        minLength: 8
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password is required' }),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters long' }),
    (0, password_strength_validator_1.IsStrongPassword)({ message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number' }),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NewSecurePass123!', description: 'Password confirmation' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password confirmation is required' }),
    (0, match_validator_1.Match)('newPassword', { message: 'Passwords do not match' }),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "confirmPassword", void 0);
//# sourceMappingURL=auth.dto.js.map