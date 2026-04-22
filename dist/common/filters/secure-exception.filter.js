"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('ExceptionFilter');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const isProduction = process.env.NODE_ENV === 'production';
        let message = 'Internal server error';
        let errorDetails = null;
        if (exception instanceof common_1.HttpException) {
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : exceptionResponse.message || message;
            errorDetails = typeof exceptionResponse === 'object' ? exceptionResponse : null;
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        const sanitizedMessage = this.sanitizeErrorMessage(message);
        if (status >= 500) {
            this.logger.error(`❌ ${request.method} ${request.url} - Status: ${status}`, exception instanceof Error ? exception.stack : exception);
        }
        else {
            this.logger.warn(`⚠️  ${request.method} ${request.url} - Status: ${status} - ${sanitizedMessage}`);
        }
        const errorResponse = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: sanitizedMessage,
        };
        if (!isProduction && errorDetails) {
            errorResponse.details = this.sanitizeObject(errorDetails);
        }
        if (!isProduction && exception instanceof Error && exception.stack) {
            errorResponse.stack = this.sanitizeStackTrace(exception.stack);
        }
        response.status(status).json(errorResponse);
    }
    sanitizeErrorMessage(message) {
        if (Array.isArray(message)) {
            return message.map(msg => this.sanitizeSingleMessage(msg));
        }
        return this.sanitizeSingleMessage(message);
    }
    sanitizeSingleMessage(message) {
        let sanitized = message.replace(/\b(sk|pk|api|secret)_[a-zA-Z0-9_-]+/gi, '[REDACTED_KEY]');
        sanitized = sanitized.replace(/mongodb:\/\/[^:]+:[^@]+@/g, 'mongodb://[REDACTED]@');
        sanitized = sanitized.replace(/postgres:\/\/[^:]+:[^@]+@/g, 'postgres://[REDACTED]@');
        sanitized = sanitized.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]');
        sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');
        sanitized = sanitized.replace(/[A-Z]:\\[\w\\.-]+/g, '[FILE_PATH]');
        sanitized = sanitized.replace(/\/[\w\/.-]+/g, (match) => {
            return match.startsWith('/home') || match.startsWith('/usr') ? '[FILE_PATH]' : match;
        });
        return sanitized;
    }
    sanitizeStackTrace(stack) {
        return stack
            .split('\n')
            .map(line => this.sanitizeSingleMessage(line))
            .join('\n');
    }
    sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizeSingleMessage(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (this.isSensitiveKey(key)) {
                        sanitized[key] = '[REDACTED]';
                    }
                    else {
                        sanitized[key] = this.sanitizeObject(obj[key]);
                    }
                }
            }
            return sanitized;
        }
        return obj;
    }
    isSensitiveKey(key) {
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
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=secure-exception.filter.js.map