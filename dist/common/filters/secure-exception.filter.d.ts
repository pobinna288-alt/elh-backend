import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private sanitizeErrorMessage;
    private sanitizeSingleMessage;
    private sanitizeStackTrace;
    private sanitizeObject;
    private isSensitiveKey;
}
