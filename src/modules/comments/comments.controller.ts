import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user.id);
  }

  @Get('ad/:adId')
  @ApiOperation({ summary: 'Get comments for an ad' })
  findByAd(@Param('adId') adId: string) {
    return this.commentsService.findByAd(adId);
  }

  @Patch(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  likeComment(@Param('id') id: string) {
    return this.commentsService.likeComment(id);
  }

  @Patch(':id/dislike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dislike a comment' })
  dislikeComment(@Param('id') id: string) {
    return this.commentsService.dislikeComment(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id);
  }
}
