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
import { AlertsService } from './alerts.service';
import { CreateSavedSearchDto, CreatePriceAlertDto } from './dto/alert.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // Saved Searches
  @Post('saved-searches')
  @ApiOperation({ summary: 'Create a saved search' })
  createSavedSearch(@Body() dto: CreateSavedSearchDto, @Request() req) {
    return this.alertsService.createSavedSearch(dto, req.user.id);
  }

  @Get('saved-searches')
  @ApiOperation({ summary: 'Get saved searches' })
  getSavedSearches(@Request() req) {
    return this.alertsService.getSavedSearches(req.user.id);
  }

  @Delete('saved-searches/:id')
  @ApiOperation({ summary: 'Delete a saved search' })
  deleteSavedSearch(@Param('id') id: string, @Request() req) {
    return this.alertsService.deleteSavedSearch(id, req.user.id);
  }

  @Patch('saved-searches/:id/toggle')
  @ApiOperation({ summary: 'Toggle saved search notifications' })
  toggleSavedSearchNotifications(@Param('id') id: string, @Request() req) {
    return this.alertsService.toggleSavedSearchNotifications(id, req.user.id);
  }

  // Price Alerts
  @Post('price-alerts')
  @ApiOperation({ summary: 'Create a price alert' })
  createPriceAlert(@Body() dto: CreatePriceAlertDto, @Request() req) {
    return this.alertsService.createPriceAlert(dto, req.user.id);
  }

  @Get('price-alerts')
  @ApiOperation({ summary: 'Get price alerts' })
  getPriceAlerts(@Request() req) {
    return this.alertsService.getPriceAlerts(req.user.id);
  }

  @Delete('price-alerts/:id')
  @ApiOperation({ summary: 'Delete a price alert' })
  deletePriceAlert(@Param('id') id: string, @Request() req) {
    return this.alertsService.deletePriceAlert(id, req.user.id);
  }

  @Patch('price-alerts/:id/toggle')
  @ApiOperation({ summary: 'Toggle price alert' })
  togglePriceAlert(@Param('id') id: string, @Request() req) {
    return this.alertsService.togglePriceAlert(id, req.user.id);
  }
}
