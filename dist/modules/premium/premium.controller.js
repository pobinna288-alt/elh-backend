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
exports.PremiumController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const premium_service_1 = require("./premium.service");
const premium_dto_1 = require("./dto/premium.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PremiumController = class PremiumController {
    constructor(premiumService) {
        this.premiumService = premiumService;
    }
    async unlockPremium(unlockPremiumDto, req) {
        return this.premiumService.unlockPremium(req.user.sub, unlockPremiumDto);
    }
};
exports.PremiumController = PremiumController;
__decorate([
    (0, common_1.Post)('unlock'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Activate premium subscription',
        description: `
Backend validates and processes premium activation via coins or card:
1. For coins: checks user has 20,000 coins and deducts them
2. For card: verifies the payment amount server-side against the configured premium price
3. Sets/extends premium expiry date by 30 days
4. Stores payment method (card or coins) and keeps premium feature access unchanged

Frontend CANNOT bypass this validation.
    `
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Premium activated successfully',
        type: premium_dto_1.PremiumActivationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Insufficient coins',
        schema: {
            properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'INSUFFICIENT_COINS' },
                required: { type: 'number', example: 20000 },
                current: { type: 'number', example: 8000 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [premium_dto_1.UnlockPremiumDto, Object]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "unlockPremium", null);
exports.PremiumController = PremiumController = __decorate([
    (0, swagger_1.ApiTags)('premium'),
    (0, common_1.Controller)('premium'),
    __metadata("design:paramtypes", [premium_service_1.PremiumService])
], PremiumController);
//# sourceMappingURL=premium.controller.js.map