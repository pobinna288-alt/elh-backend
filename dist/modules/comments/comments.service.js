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
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const comment_entity_1 = require("./entities/comment.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let CommentsService = class CommentsService {
    constructor(commentRepository, notificationsService) {
        this.commentRepository = commentRepository;
        this.notificationsService = notificationsService;
    }
    async create(createCommentDto, userId) {
        const comment = this.commentRepository.create({
            ...createCommentDto,
            userId,
        });
        const savedComment = await this.commentRepository.save(comment);
        const commentWithAd = await this.commentRepository.findOne({
            where: { id: savedComment.id },
            relations: ['ad', 'ad.author'],
        });
        if (commentWithAd?.ad?.author && commentWithAd.ad.author.id !== userId) {
            await this.notificationsService.notifyAdComment(commentWithAd.ad.author.id, createCommentDto.adId, userId);
        }
        return savedComment;
    }
    async findByAd(adId) {
        const comments = await this.commentRepository.find({
            where: { adId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
        return {
            count: comments.length,
            comments,
        };
    }
    async likeComment(id) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        comment.likes += 1;
        return this.commentRepository.save(comment);
    }
    async dislikeComment(id) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        comment.dislikes += 1;
        return this.commentRepository.save(comment);
    }
    async remove(id, userId) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own comments');
        }
        await this.commentRepository.remove(comment);
        return { message: 'Comment deleted successfully' };
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(comment_entity_1.Comment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map