import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(createReviewDto: CreateReviewDto, req: any): Promise<import("./entities/review.entity").Review>;
    findByAd(adId: string): Promise<{
        reviews: import("./entities/review.entity").Review[];
        totalReviews: number;
        averageRating: number;
    }>;
    findBySeller(sellerId: string): Promise<{
        reviews: import("./entities/review.entity").Review[];
        totalReviews: number;
        averageRating: number;
    }>;
    markHelpful(id: string): Promise<import("./entities/review.entity").Review>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
