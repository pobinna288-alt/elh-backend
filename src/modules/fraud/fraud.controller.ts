import { Controller, Post, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('rewards/fraud-protected')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(private fraudService: FraudService) {}

  @Post('ad/start')
  async startAd(@Body() data: { adId: string }, @Request() req) {
    return await this.fraudService.startAdSession(req.user.id, data.adId);
  }

  @Post('ad/checkpoint')
  async saveCheckpoint(@Body() data: { sessionId: string; progress: number }) {
    await this.fraudService.saveCheckpoint(data.sessionId, data.progress);
    return { saved: true };
  }

  @Post('ad/complete')
  async completeAd(
    @Body() data: { sessionId: string; adId: string; deviceFingerprint: string },
    @Request() req,
  ) {
    const result = await this.fraudService.completeAd(
      data.sessionId,
      req.user.id,
      data,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent'],
    );

    return result;
  }

  @Post('risk-score')
  async getRiskScore(@Request() req) {
    const score = await this.fraudService.calculateRiskScore(req.user.id);
    return { riskScore: score };
  }
}
