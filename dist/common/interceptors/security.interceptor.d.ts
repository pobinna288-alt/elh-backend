import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class SecurityInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly sensitiveFields;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private sanitizeResponse;
    private isSensitiveField;
}
