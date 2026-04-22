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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const review_entity_1 = require("./entities/review.entity");
let ReviewsService = class ReviewsService {
    constructor(reviewRepository) {
        this.reviewRepository = reviewRepository;
    }
    async create(createReviewDto, userId) {
        const review = this.reviewRepository.create({
            ...createReviewDto,
            userId,
        });
        return this.reviewRepository.save(review);
    }
    async findByAd(adId) {
        const reviews = await this.reviewRepository.find({
            where: { adId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return {
            reviews,
            totalReviews: reviews.length,
            averageRating: Number(avgRating.toFixed(1)),
        };
    }
    async findBySeller(sellerId) {
        const reviews = await this.reviewRepository.find({
            where: { sellerId },
            relations: ['user', 'ad'],
            order: { createdAt: 'DESC' },
        });
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return {
            reviews,
            totalReviews: reviews.length,
            averageRating: Number(avgRating.toFixed(1)),
        };
    }
    async markHelpful(id) {
        const review = await this.reviewRepository.findOne({ where: { id } });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        review.helpfulCount += 1;
        return this.reviewRepository.save(review);
    }
    async remove(id, userId) {
        const review = await this.reviewRepository.findOne({ where: { id } });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        if (review.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own reviews');
        }
        await this.reviewRepository.remove(review);
        return { message: 'Review deleted successfully' };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map