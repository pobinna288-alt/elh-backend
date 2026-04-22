import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    create(createCommentDto: CreateCommentDto, req: any): Promise<import("./entities/comment.entity").Comment>;
    findByAd(adId: string): Promise<{
        count: number;
        comments: import("./entities/comment.entity").Comment[];
    }>;
    likeComment(id: string): Promise<import("./entities/comment.entity").Comment>;
    dislikeComment(id: string): Promise<import("./entities/comment.entity").Comment>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
