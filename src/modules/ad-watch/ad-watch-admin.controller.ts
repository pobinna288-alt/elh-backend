import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdWatchService } from './ad-watch.service';
import { CoinBoostEvent } from './entities/coin-boost-event.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNumber, IsDate, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for creating a boost event
 */
export class CreateBoostEventDto {
  @ApiProperty({ description: 'Event name', example: 'Weekend Bonus!' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Multiplier (1.0-10.0)', example: 2.0 })
  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  multiplier: number;

  @ApiProperty({ description: 'Event start time' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: 'Event end time' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiPropertyOptional({
    description: 'Eligible tiers (null = all)',
    type: [String],
    example: ['PREMIUM', 'PRO', 'HOT'],
  })
  @IsOptional()
  @IsArray()
  eligibleTiers?: string[];

  @ApiPropertyOptional({ description: 'Maximum total coins to distribute' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalCoins?: number;
}

/**
 * Admin Controller for Coin Boost Events
 * 
 * Allows administrators to create and manage coin boost events.
 * Boost events apply multipliers to all coin rewards during the event period.
 */
@ApiTags('ad-watch-admin')
@Controller('admin/ad-watch')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdWatchAdminController {
  constructor(private readonly adWatchService: AdWatchService) {}

  /**
   * Create a new coin boost event
   */
  @Post('boost-events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a coin boost event',
    description:
      'Creates a new temporary event that multiplies coin rewards. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Boost event created successfully',
    type: CoinBoostEvent,
  })
  async createBoostEvent(
    @Body() dto: CreateBoostEventDto,
  ): Promise<CoinBoostEvent> {
    return this.adWatchService.createBoostEvent(dto);
  }

  /**
   * Get all boost events
   */
  @Get('boost-events')
  @ApiOperation({
    summary: 'List all boost events',
    description: 'Returns all boost events (active and inactive).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of boost events',
    type: [CoinBoostEvent],
  })
  async getAllBoostEvents(): Promise<CoinBoostEvent[]> {
    return this.adWatchService.getAllBoostEvents();
  }

  /**
   * Deactivate a boost event
   */
  @Patch('boost-events/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Boost event ID' })
  @ApiOperation({
    summary: 'Deactivate a boost event',
    description: 'Immediately stops a boost event from applying multipliers.',
  })
  @ApiResponse({ status: 200, description: 'Event deactivated' })
  async deactivateBoostEvent(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.adWatchService.deactivateBoostEvent(id);
    return { success: true };
  }
}
