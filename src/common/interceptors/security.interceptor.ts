import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Security Interceptor
 * 
 * ⚠️ SECURITY FEATURES:
 * 1. Strips sensitive fields from responses
 * 2. Prevents accidental exposure of API keys, passwords, tokens
 * 3. Sanitizes nested objects recursively
 */
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityInterceptor');

  // Fields that should NEVER be sent to frontend
  private readonly sensitiveFields = [
    'password',
    'passwordHash',
    'secret',
    'secretKey',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'token',
    'refreshToken',
    'accessToken',
    'stripe_secret_key',
    'paystack_secret_key',
    'jwt_secret',
    'sessionToken',
    'stripeSecretKey',
    'paystackSecretKey',
    'jwtSecret',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Skip sanitization for non-object responses
        if (typeof data !== 'object' || data === null) {
          return data;
        }

        return this.sanitizeResponse(data);
      }),
    );
  }

  /**
   * Recursively sanitize response object
   */
  private sanitizeResponse(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeResponse(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const sanitized: any = {};

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // ⚠️ SECURITY: Remove sensitive fields
          if (this.isSensitiveField(key)) {
            this.logger.warn(`⚠️  Blocked sensitive field from response: ${key}`);
            continue; // Skip this field entirely
          }

          // Recursively sanitize nested objects
          sanitized[key] = this.sanitizeResponse(obj[key]);
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive.toLowerCase())
    );
  }
}
