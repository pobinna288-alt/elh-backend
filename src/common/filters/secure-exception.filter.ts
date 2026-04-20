import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global Exception Filter with Security Hardening
 * 
 * ⚠️ SECURITY FEATURES:
 * 1. Sanitizes error messages to prevent sensitive data leakage
 * 2. Never exposes API keys, secrets, or internal paths in production
 * 3. Filters out environment variables from stack traces
 * 4. Logs full errors server-side but sends safe errors to client
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';

    // Get error details
    let message = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || message;
      errorDetails = typeof exceptionResponse === 'object' ? exceptionResponse : null;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // ⚠️ SECURITY: Sanitize error messages
    const sanitizedMessage = this.sanitizeErrorMessage(message);

    // Log full error server-side (for debugging)
    if (status >= 500) {
      this.logger.error(
        `❌ ${request.method} ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      this.logger.warn(
        `⚠️  ${request.method} ${request.url} - Status: ${status} - ${sanitizedMessage}`,
      );
    }

    // Prepare response
    const errorResponse: any = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: sanitizedMessage,
    };

    // In development, include more details
    if (!isProduction && errorDetails) {
      errorResponse.details = this.sanitizeObject(errorDetails);
    }

    // ⚠️ SECURITY: Never expose stack traces in production
    if (!isProduction && exception instanceof Error && exception.stack) {
      errorResponse.stack = this.sanitizeStackTrace(exception.stack);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Sanitize error messages to prevent sensitive data leakage
   */
  private sanitizeErrorMessage(message: string | string[]): string | string[] {
    if (Array.isArray(message)) {
      return message.map(msg => this.sanitizeSingleMessage(msg));
    }
    return this.sanitizeSingleMessage(message);
  }

  private sanitizeSingleMessage(message: string): string {
    // Remove potential API keys (any sk_*, pk_*, etc.)
    let sanitized = message.replace(/\b(sk|pk|api|secret)_[a-zA-Z0-9_-]+/gi, '[REDACTED_KEY]');
    
    // Remove connection strings
    sanitized = sanitized.replace(/mongodb:\/\/[^:]+:[^@]+@/g, 'mongodb://[REDACTED]@');
    sanitized = sanitized.replace(/postgres:\/\/[^:]+:[^@]+@/g, 'postgres://[REDACTED]@');
    
    // Remove email addresses (except domain)
    sanitized = sanitized.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]');
    
    // Remove IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');
    
    // Remove file paths
    sanitized = sanitized.replace(/[A-Z]:\\[\w\\.-]+/g, '[FILE_PATH]');
    sanitized = sanitized.replace(/\/[\w\/.-]+/g, (match) => {
      // Keep relative paths but hide absolute ones
      return match.startsWith('/home') || match.startsWith('/usr') ? '[FILE_PATH]' : match;
    });

    return sanitized;
  }

  /**
   * Sanitize stack traces
   */
  private sanitizeStackTrace(stack: string): string {
    return stack
      .split('\n')
      .map(line => this.sanitizeSingleMessage(line))
      .join('\n');
  }

  /**
   * Sanitize objects (recursively)
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeSingleMessage(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Never include sensitive keys
          if (this.isSensitiveKey(key)) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = this.sanitizeObject(obj[key]);
          }
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Check if a key name is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /auth/i,
      /credential/i,
      /private/i,
      /session/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }
}
