import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdSuggestionPlanGuard } from './guards/ad-suggestion-plan.guard';
import { AdSuggestionService } from './ad-suggestion.service';
import {
  AdSuggestionDto,
  AdSuggestionResponseDto,
} from './dto/ad-suggestion.dto';

@ApiTags('ad-suggestion')
@Controller('ad-suggestion')
@UseGuards(JwtAuthGuard, AdSuggestionPlanGuard)
@ApiBearerAuth()
export class AdSuggestionController {
  constructor(private readonly adSuggestionService: AdSuggestionService) {}

  @Post()
  @ApiOperation({
    summary: 'Get AI-powered ad copy suggestions (Premium / Pro / Hot / Enterprise)',
    description:
      'Accepts an ad title and/or description and returns attractive, ' +
      'persuasive, high-converting alternatives. The original text is ' +
      'never overwritten — suggestions are returned for the user to accept or ignore.',
  })
  @ApiResponse({
    status: 201,
    description: 'Suggestions generated successfully',
    type: AdSuggestionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Neither title nor description provided' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Plan not eligible for AI suggestions' })
  async suggest(
    @Body() dto: AdSuggestionDto,
    @Request() req,
    @Ip() ip: string,
  ): Promise<AdSuggestionResponseDto> {
    return this.adSuggestionService.suggest(
      dto.title,
      dto.description,
      dto.category,
      dto.targetAudience,
      req.user.userId || req.user.sub,
      req.user.role || req.user.plan,
      ip,
    );
  }
}
