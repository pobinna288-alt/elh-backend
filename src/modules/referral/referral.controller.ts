import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('referral')
@Controller('referral')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('code')
  @ApiOperation({ summary: 'Get user referral code' })
  getReferralCode(@Request() req) {
    return this.referralService.getReferralCode(req.user.id);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply a referral code' })
  applyReferralCode(@Body('referralCode') referralCode: string, @Request() req) {
    return this.referralService.applyReferralCode(req.user.id, referralCode);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics' })
  getStats(@Request() req) {
    return this.referralService.getStats(req.user.id);
  }

  @Get('referred-users')
  @ApiOperation({ summary: 'Get list of referred users' })
  getReferredUsers(@Request() req) {
    return this.referralService.getReferredUsers(req.user.id);
  }
}
