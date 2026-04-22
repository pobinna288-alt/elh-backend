import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CommentsService {
    private commentRepository;
    private notificationsService;
    constructor(commentRepository: Repository<Comment>, notificationsService: NotificationsService);
    create(createCommentDto: CreateCommentDto, userId: string): Promise<Comment>;
    findByAd(adId: string): Promise<{
        count: number;
        comments: Comment[];
    }>;
    likeComment(id: string): Promise<Comment>;
    dislikeComment(id: string): Promise<Comment>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
