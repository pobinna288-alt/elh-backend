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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto, ipAddress, userAgent) {
        return this.authService.login(loginDto, ipAddress, userAgent);
    }
    async refresh(refreshTokenDto, ipAddress) {
        return this.authService.refreshAccessToken(refreshTokenDto, ipAddress);
    }
    async logout(refreshTokenDto) {
        return this.authService.logout(refreshTokenDto.refreshToken);
    }
    async logoutAll(req) {
        return this.authService.logoutAllDevices(req.user.sub);
    }
    async logoutDevice(req, tokenId) {
        return this.authService.logoutDevice(req.user.sub, tokenId);
    }
    async getActiveSessions(req) {
        return this.authService.getActiveSessions(req.user.sub);
    }
    async requestPasswordReset(passwordResetRequestDto) {
        return this.authService.requestPasswordReset(passwordResetRequestDto.email);
    }
    async resetPassword(passwordResetConfirmDto) {
        return this.authService.resetPassword(passwordResetConfirmDto.token, passwordResetConfirmDto.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User successfully registered',
        type: auth_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'User already exists' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login user and receive access + refresh tokens' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User successfully logged in',
        type: auth_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials or account locked' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token using refresh token' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Access token refreshed successfully',
        schema: {
            properties: {
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, swagger_1.ApiOperation)({ summary: 'Logout from current device (revoke refresh token)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Logged out successfully',
        schema: {
            properties: {
                message: { type: 'string', example: 'Logged out successfully from this device' },
                success: { type: 'boolean', example: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Refresh token is required' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Logout from all devices (revoke all refresh tokens)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Logged out from all devices',
        schema: {
            properties: {
                message: { type: 'string', example: 'Logged out from 3 device(s) successfully' },
                devicesLoggedOut: { type: 'number', example: 3 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Delete)('sessions/:tokenId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Logout specific device by session ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Device logged out successfully',
        schema: {
            properties: {
                message: { type: 'string', example: 'Device logged out successfully' },
                success: { type: 'boolean', example: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Session not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('tokenId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutDevice", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active sessions for current user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of active sessions',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string', example: 'uuid' },
                    deviceInfo: { type: 'string', example: 'Mozilla/5.0...' },
                    ipAddress: { type: 'string', example: '192.168.1.1' },
                    createdAt: { type: 'string', example: '2026-01-12T10:00:00Z' },
                    lastUsedAt: { type: 'string', example: '2026-01-12T15:30:00Z' },
                    expiresAt: { type: 'string', example: '2026-02-11T10:00:00Z' }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getActiveSessions", null);
__decorate([
    (0, common_1.Post)('password-reset/request'),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset link' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Reset link sent if email exists',
        schema: {
            properties: {
                message: { type: 'string', example: 'If an account with that email exists, a password reset link has been sent' },
                success: { type: 'boolean', example: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, common_1.Post)('password-reset/confirm'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password with token' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
        schema: {
            properties: {
                message: { type: 'string', example: 'Password has been reset successfully. Please login with your new password.' },
                success: { type: 'boolean', example: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetConfirmDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map