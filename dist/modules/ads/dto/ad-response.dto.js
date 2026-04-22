"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdDetailsDto = exports.AdListItemDto = exports.AdResponseDto = void 0;
class AdResponseDto {
    constructor(ad) {
        this.id = ad.id;
        this.title = ad.title;
        this.description = ad.description;
        this.price = ad.price;
        this.category = ad.category;
        this.images = ad.images || [];
        this.status = ad.status;
        this.views = ad.views || 0;
        this.createdAt = ad.createdAt;
        if (ad.user) {
            this.user = {
                id: ad.user.id,
                username: ad.user.username,
            };
        }
    }
}
exports.AdResponseDto = AdResponseDto;
class AdListItemDto {
    constructor(ad) {
        this.id = ad.id;
        this.title = ad.title;
        this.price = ad.price;
        this.image = ad.images?.[0] || null;
        this.category = ad.category;
        this.createdAt = ad.createdAt;
    }
}
exports.AdListItemDto = AdListItemDto;
class AdDetailsDto extends AdResponseDto {
    constructor(ad) {
        super(ad);
        this.location = ad.location;
        this.contactInfo = ad.contactInfo;
        this.totalViews = ad.views || 0;
        this.totalComments = ad.commentsCount || 0;
    }
}
exports.AdDetailsDto = AdDetailsDto;
//# sourceMappingURL=ad-response.dto.js.map