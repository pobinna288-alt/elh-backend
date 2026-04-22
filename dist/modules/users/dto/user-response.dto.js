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
exports.UserProfileDto = exports.MinimalUserDto = exports.UserResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const user_entity_1 = require("../entities/user.entity");
class UserResponseDto {
    constructor(user) {
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
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User unique ID' }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Username' }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User email' }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Full name' }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coin balance - backend source of truth', example: 5000 }),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "coins", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Premium status - calculated by backend', example: true }),
    __metadata("design:type", Boolean)
], UserResponseDto.prototype, "isPremium", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User role', enum: user_entity_1.UserRole }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Premium expiration date', required: false }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "premiumExpiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Profile photo URL', required: false }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "profilePhoto", void 0);
class MinimalUserDto {
    constructor(user) {
        this.id = user.id;
        this.username = user.username;
    }
}
exports.MinimalUserDto = MinimalUserDto;
class UserProfileDto extends UserResponseDto {
    constructor(user) {
        super(user);
        this.bio = user.bio;
        this.avatar = user.avatar;
        this.phone = user.phone;
        this.totalAds = user.totalAds;
        this.memberSince = user.createdAt;
    }
}
exports.UserProfileDto = UserProfileDto;
//# sourceMappingURL=user-response.dto.js.map