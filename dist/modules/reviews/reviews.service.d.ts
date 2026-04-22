import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsService {
    private reviewRepository;
    constructor(reviewRepository: Repository<Review>);
    create(createReviewDto: CreateReviewDto, userId: string): Promise<Review>;
    findByAd(adId: string): Promise<{
        reviews: Review[];
        totalReviews: number;
        averageRating: number;
    }>;
    findBySeller(sellerId: string): Promise<{
        reviews: Review[];
        totalReviews: number;
        averageRating: number;
    }>;
    markHelpful(id: string): Promise<Review>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
