import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get('ad/:adId')
  @ApiOperation({ summary: 'Get reviews for an ad' })
  findByAd(@Param('adId') adId: string) {
    return this.reviewsService.findByAd(adId);
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get reviews for a seller' })
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.reviewsService.findBySeller(sellerId);
  }

  @Patch(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewsService.remove(id, req.user.id);
  }
}
