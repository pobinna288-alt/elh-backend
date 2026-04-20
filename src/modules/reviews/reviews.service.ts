import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: string) {
    const review = this.reviewRepository.create({
      ...createReviewDto,
      userId,
    });
    return this.reviewRepository.save(review);
  }

  async findByAd(adId: string) {
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

  async findBySeller(sellerId: string) {
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

  async markHelpful(id: string) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.helpfulCount += 1;
    return this.reviewRepository.save(review);
  }

  async remove(id: string, userId: string) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
    return { message: 'Review deleted successfully' };
  }
}
