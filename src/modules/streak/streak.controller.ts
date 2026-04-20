import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('streak')
@Controller('streak')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get()
  @ApiOperation({ summary: 'Get user streak information' })
  getStreak(@Request() req) {
    return this.streakService.getStreak(req.user.id);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Daily check-in to maintain streak' })
  checkIn(@Request() req) {
    return this.streakService.checkIn(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get streak leaderboard' })
  getLeaderboard() {
    return this.streakService.getLeaderboard();
  }
}
