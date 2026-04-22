"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestValidationMiddleware = void 0;
const common_1 = require("@nestjs/common");
const performance_logger_service_1 = require("../../performance/services/performance-logger.service");
let RequestValidationMiddleware = class RequestValidationMiddleware {
    constructor(performanceLogger) {
        this.performanceLogger = performanceLogger;
        this.maxRequestSize = 10 * 1024 * 1024;
    }
    use(req, res, next) {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > this.maxRequestSize) {
            this.performanceLogger.logError('Request Too Large', new Error('Request size exceeds limit'), { size: contentLength, ip: req.ip });
            return res.status(413).json({
                success: false,
                message: 'Request entity too large',
            });
        }
        if (this.hasAttackPatterns(req.url)) {
            this.performanceLogger.logError('Potential Attack', new Error('Attack pattern detected in URL'), { url: req.url, ip: req.ip });
            return res.status(400).json({
                success: false,
                message: 'Invalid request',
            });
        }
        next();
    }
    hasAttackPatterns(url) {
        const patterns = [
            '../',
            '<script',
            'javascript:',
            'SELECT',
            'DROP',
            'UNION',
        ];
        return patterns.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()));
    }
};
exports.RequestValidationMiddleware = RequestValidationMiddleware;
exports.RequestValidationMiddleware = RequestValidationMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [performance_logger_service_1.PerformanceLogger])
], RequestValidationMiddleware);
//# sourceMappingURL=request-validation.middleware.js.map