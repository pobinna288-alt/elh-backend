import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('social')
@Controller('social')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // Follow/Unfollow
  @Post('follow/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  followUser(@Param('userId') userId: string, @Request() req) {
    return this.socialService.followUser(req.user.id, userId);
  }

  @Delete('follow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  unfollowUser(@Param('userId') userId: string, @Request() req) {
    return this.socialService.unfollowUser(req.user.id, userId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get your followers' })
  getFollowers(@Request() req) {
    return this.socialService.getFollowers(req.user.id);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users you are following' })
  getFollowing(@Request() req) {
    return this.socialService.getFollowing(req.user.id);
  }

  @Get('is-following/:userId')
  @ApiOperation({ summary: 'Check if following a user' })
  isFollowing(@Param('userId') userId: string, @Request() req) {
    return this.socialService.isFollowing(req.user.id, userId);
  }

  // Wishlist
  @Post('wishlist/:adId')
  @ApiOperation({ summary: 'Add ad to wishlist' })
  addToWishlist(@Param('adId') adId: string, @Request() req) {
    return this.socialService.addToWishlist(req.user.id, adId);
  }

  @Delete('wishlist/:adId')
  @ApiOperation({ summary: 'Remove ad from wishlist' })
  removeFromWishlist(@Param('adId') adId: string, @Request() req) {
    return this.socialService.removeFromWishlist(req.user.id, adId);
  }

  @Get('wishlist')
  @ApiOperation({ summary: 'Get wishlist' })
  getWishlist(@Request() req) {
    return this.socialService.getWishlist(req.user.id);
  }

  @Get('wishlist/check/:adId')
  @ApiOperation({ summary: 'Check if ad is in wishlist' })
  isInWishlist(@Param('adId') adId: string, @Request() req) {
    return this.socialService.isInWishlist(req.user.id, adId);
  }
}
