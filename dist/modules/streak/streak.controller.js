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
exports.StreakController = void 0;
const common_1 = require("@nestjs/common");
const streak_service_1 = require("./streak.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let StreakController = class StreakController {
    constructor(streakService) {
        this.streakService = streakService;
    }
    getStreak(req) {
        return this.streakService.getStreak(req.user.id);
    }
    checkIn(req) {
        return this.streakService.checkIn(req.user.id);
    }
    getLeaderboard() {
        return this.streakService.getLeaderboard();
    }
};
exports.StreakController = StreakController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user streak information' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StreakController.prototype, "getStreak", null);
__decorate([
    (0, common_1.Post)('check-in'),
    (0, swagger_1.ApiOperation)({ summary: 'Daily check-in to maintain streak' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StreakController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get streak leaderboard' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StreakController.prototype, "getLeaderboard", null);
exports.StreakController = StreakController = __decorate([
    (0, swagger_1.ApiTags)('streak'),
    (0, common_1.Controller)('streak'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [streak_service_1.StreakService])
], StreakController);
//# sourceMappingURL=streak.controller.js.map