import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';

/**
 * API Key Guard
 * 
 * Validates API keys for service-to-service communication
 * More secure than exposing certain endpoints publicly
 * 
 * Usage: Add @UseGuards(ApiKeyGuard) to controller methods
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private performanceLogger: PerformanceLogger,
  ) {
    this.apiKey = this.configService.get<string>('API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'];

    if (!providedKey || providedKey !== this.apiKey) {
      this.performanceLogger.logError(
        'Invalid API Key',
        new Error('API key validation failed'),
        { ip: request.ip },
      );
      
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}
