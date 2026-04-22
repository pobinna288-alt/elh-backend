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
exports.AdWatchAdminController = exports.CreateBoostEventDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ad_watch_service_1 = require("./ad-watch.service");
const coin_boost_event_entity_1 = require("./entities/coin-boost-event.entity");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateBoostEventDto {
}
exports.CreateBoostEventDto = CreateBoostEventDto;
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Event name', example: 'Weekend Bonus!' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBoostEventDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Event description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBoostEventDto.prototype, "description", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Multiplier (1.0-10.0)', example: 2.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1.0),
    (0, class_validator_1.Max)(10.0),
    __metadata("design:type", Number)
], CreateBoostEventDto.prototype, "multiplier", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Event start time' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateBoostEventDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Event end time' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateBoostEventDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        description: 'Eligible tiers (null = all)',
        type: [String],
        example: ['PREMIUM', 'PRO', 'HOT'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateBoostEventDto.prototype, "eligibleTiers", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Maximum total coins to distribute' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateBoostEventDto.prototype, "maxTotalCoins", void 0);
let AdWatchAdminController = class AdWatchAdminController {
    constructor(adWatchService) {
        this.adWatchService = adWatchService;
    }
    async createBoostEvent(dto) {
        return this.adWatchService.createBoostEvent(dto);
    }
    async getAllBoostEvents() {
        return this.adWatchService.getAllBoostEvents();
    }
    async deactivateBoostEvent(id) {
        await this.adWatchService.deactivateBoostEvent(id);
        return { success: true };
    }
};
exports.AdWatchAdminController = AdWatchAdminController;
__decorate([
    (0, common_1.Post)('boost-events'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a coin boost event',
        description: 'Creates a new temporary event that multiplies coin rewards. Admin only.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Boost event created successfully',
        type: coin_boost_event_entity_1.CoinBoostEvent,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBoostEventDto]),
    __metadata("design:returntype", Promise)
], AdWatchAdminController.prototype, "createBoostEvent", null);
__decorate([
    (0, common_1.Get)('boost-events'),
    (0, swagger_1.ApiOperation)({
        summary: 'List all boost events',
        description: 'Returns all boost events (active and inactive).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of boost events',
        type: [coin_boost_event_entity_1.CoinBoostEvent],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdWatchAdminController.prototype, "getAllBoostEvents", null);
__decorate([
    (0, common_1.Patch)('boost-events/:id/deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Boost event ID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Deactivate a boost event',
        description: 'Immediately stops a boost event from applying multipliers.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Event deactivated' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdWatchAdminController.prototype, "deactivateBoostEvent", null);
exports.AdWatchAdminController = AdWatchAdminController = __decorate([
    (0, swagger_1.ApiTags)('ad-watch-admin'),
    (0, common_1.Controller)('admin/ad-watch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ad_watch_service_1.AdWatchService])
], AdWatchAdminController);
//# sourceMappingURL=ad-watch-admin.controller.js.map