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
exports.SocialController = void 0;
const common_1 = require("@nestjs/common");
const social_service_1 = require("./social.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let SocialController = class SocialController {
    constructor(socialService) {
        this.socialService = socialService;
    }
    followUser(userId, req) {
        return this.socialService.followUser(req.user.id, userId);
    }
    unfollowUser(userId, req) {
        return this.socialService.unfollowUser(req.user.id, userId);
    }
    getFollowers(req) {
        return this.socialService.getFollowers(req.user.id);
    }
    getFollowing(req) {
        return this.socialService.getFollowing(req.user.id);
    }
    isFollowing(userId, req) {
        return this.socialService.isFollowing(req.user.id, userId);
    }
    addToWishlist(adId, req) {
        return this.socialService.addToWishlist(req.user.id, adId);
    }
    removeFromWishlist(adId, req) {
        return this.socialService.removeFromWishlist(req.user.id, adId);
    }
    getWishlist(req) {
        return this.socialService.getWishlist(req.user.id);
    }
    isInWishlist(adId, req) {
        return this.socialService.isInWishlist(req.user.id, adId);
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Post)('follow/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Follow a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "followUser", null);
__decorate([
    (0, common_1.Delete)('follow/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Unfollow a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "unfollowUser", null);
__decorate([
    (0, common_1.Get)('followers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get your followers' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getFollowers", null);
__decorate([
    (0, common_1.Get)('following'),
    (0, swagger_1.ApiOperation)({ summary: 'Get users you are following' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getFollowing", null);
__decorate([
    (0, common_1.Get)('is-following/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if following a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "isFollowing", null);
__decorate([
    (0, common_1.Post)('wishlist/:adId'),
    (0, swagger_1.ApiOperation)({ summary: 'Add ad to wishlist' }),
    __param(0, (0, common_1.Param)('adId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)('wishlist/:adId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove ad from wishlist' }),
    __param(0, (0, common_1.Param)('adId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Get)('wishlist'),
    (0, swagger_1.ApiOperation)({ summary: 'Get wishlist' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Get)('wishlist/check/:adId'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if ad is in wishlist' }),
    __param(0, (0, common_1.Param)('adId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "isInWishlist", null);
exports.SocialController = SocialController = __decorate([
    (0, swagger_1.ApiTags)('social'),
    (0, common_1.Controller)('social'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [social_service_1.SocialService])
], SocialController);
//# sourceMappingURL=social.controller.js.map