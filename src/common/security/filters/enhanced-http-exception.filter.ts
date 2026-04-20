import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';

/**
 * Enhanced HTTP Exception Filter
 * 
 * Handles all HTTP exceptions with:
 * - Consistent error response format
 * - Error logging
 * - Performance tracking
 * - Security (hides sensitive errors in production)
 */
@Catch()
export class EnhancedHttpExceptionFilter implements ExceptionFilter {
  constructor(private performanceLogger: PerformanceLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log error
    if (status >= 500) {
      this.performanceLogger.logError(
        'Server Error',
        exception as Error,
        {
          method: request.method,
          url: request.url,
          status,
        },
      );
    }

    // Send response
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
