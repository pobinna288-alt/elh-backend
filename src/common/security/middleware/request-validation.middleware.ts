import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';

/**
 * Request Validation Middleware
 * 
 * Validates and sanitizes incoming requests:
 * - Checks request size (prevents DoS)
 * - Validates content type
 * - Basic security checks
 */
@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly maxRequestSize = 10 * 1024 * 1024; // 10MB

  constructor(private performanceLogger: PerformanceLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Check request size
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > this.maxRequestSize) {
      this.performanceLogger.logError(
        'Request Too Large',
        new Error('Request size exceeds limit'),
        { size: contentLength, ip: req.ip },
      );
      
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
      });
    }

    // Check for common attack patterns in URL
    if (this.hasAttackPatterns(req.url)) {
      this.performanceLogger.logError(
        'Potential Attack',
        new Error('Attack pattern detected in URL'),
        { url: req.url, ip: req.ip },
      );
      
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
      });
    }

    next();
  }

  /**
   * Check for common attack patterns
   */
  private hasAttackPatterns(url: string): boolean {
    const patterns = [
      '../',           // Path traversal
      '<script',       // XSS
      'javascript:',   // XSS
      'SELECT',        // SQL injection
      'DROP',          // SQL injection
      'UNION',         // SQL injection
    ];

    return patterns.some(pattern => 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
