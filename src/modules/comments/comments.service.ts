import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string) {
    const comment = this.commentRepository.create({
      ...createCommentDto,
      userId,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Get ad author to send notification
    const commentWithAd = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['ad', 'ad.author'],
    });

    if (commentWithAd?.ad?.author && commentWithAd.ad.author.id !== userId) {
      await this.notificationsService.notifyAdComment(
        commentWithAd.ad.author.id,
        createCommentDto.adId,
        userId,
      );
    }

    return savedComment;
  }

  async findByAd(adId: string) {
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

  async likeComment(id: string) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    comment.likes += 1;
    return this.commentRepository.save(comment);
  }

  async dislikeComment(id: string) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    comment.dislikes += 1;
    return this.commentRepository.save(comment);
  }

  async remove(id: string, userId: string) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
    return { message: 'Comment deleted successfully' };
  }
}
