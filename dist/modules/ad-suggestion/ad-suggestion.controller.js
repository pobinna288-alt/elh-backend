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
exports.AdSuggestionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const ad_suggestion_plan_guard_1 = require("./guards/ad-suggestion-plan.guard");
const ad_suggestion_service_1 = require("./ad-suggestion.service");
const ad_suggestion_dto_1 = require("./dto/ad-suggestion.dto");
let AdSuggestionController = class AdSuggestionController {
    constructor(adSuggestionService) {
        this.adSuggestionService = adSuggestionService;
    }
    async suggest(dto, req, ip) {
        return this.adSuggestionService.suggest(dto.title, dto.description, dto.category, dto.targetAudience, req.user.userId || req.user.sub, req.user.role || req.user.plan, ip);
    }
};
exports.AdSuggestionController = AdSuggestionController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get AI-powered ad copy suggestions (Premium / Pro / Hot / Enterprise)',
        description: 'Accepts an ad title and/or description and returns attractive, ' +
            'persuasive, high-converting alternatives. The original text is ' +
            'never overwritten — suggestions are returned for the user to accept or ignore.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Suggestions generated successfully',
        type: ad_suggestion_dto_1.AdSuggestionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Neither title nor description provided' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authenticated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Plan not eligible for AI suggestions' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_suggestion_dto_1.AdSuggestionDto, Object, String]),
    __metadata("design:returntype", Promise)
], AdSuggestionController.prototype, "suggest", null);
exports.AdSuggestionController = AdSuggestionController = __decorate([
    (0, swagger_1.ApiTags)('ad-suggestion'),
    (0, common_1.Controller)('ad-suggestion'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, ad_suggestion_plan_guard_1.AdSuggestionPlanGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ad_suggestion_service_1.AdSuggestionService])
], AdSuggestionController);
//# sourceMappingURL=ad-suggestion.controller.js.map