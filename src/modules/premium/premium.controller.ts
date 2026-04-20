import { Controller, Post, UseGuards, Request, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { PremiumActivationResponseDto, UnlockPremiumDto } from './dto/premium.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('premium')
@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Activate premium subscription',
    description: `
Backend validates and processes premium activation via coins or card:
1. For coins: checks user has 20,000 coins and deducts them
2. For card: verifies the payment amount server-side against the configured premium price
3. Sets/extends premium expiry date by 30 days
4. Stores payment method (card or coins) and keeps premium feature access unchanged

Frontend CANNOT bypass this validation.
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Premium activated successfully',
    type: PremiumActivationResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Insufficient coins',
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'INSUFFICIENT_COINS' },
        required: { type: 'number', example: 20000 },
        current: { type: 'number', example: 8000 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unlockPremium(
    @Body() unlockPremiumDto: UnlockPremiumDto,
    @Request() req,
  ): Promise<PremiumActivationResponseDto> {
    return this.premiumService.unlockPremium(req.user.sub, unlockPremiumDto);
  }
}
