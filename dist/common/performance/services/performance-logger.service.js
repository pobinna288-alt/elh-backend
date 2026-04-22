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
exports.PerformanceLogger = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let PerformanceLogger = class PerformanceLogger {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger('Performance');
        this.slowRequestThreshold = 1000;
        this.isProduction = configService.get('NODE_ENV') === 'production';
    }
    logSlowRequest(method, url, duration, statusCode) {
        if (duration > this.slowRequestThreshold) {
            this.logger.warn({
                type: 'SLOW_REQUEST',
                method,
                url,
                duration: `${duration.toFixed(2)}ms`,
                statusCode,
                timestamp: new Date().toISOString(),
            });
        }
    }
    logQueryPerformance(query, duration, rows) {
        if (this.isProduction && duration > 100) {
            this.logger.warn({
                type: 'SLOW_QUERY',
                query: query.substring(0, 200),
                duration: `${duration.toFixed(2)}ms`,
                rows,
                timestamp: new Date().toISOString(),
            });
        }
    }
    logCacheEvent(event, key, duration) {
        if (this.isProduction && event === 'MISS') {
            this.logger.debug({
                type: 'CACHE_MISS',
                key,
                timestamp: new Date().toISOString(),
            });
        }
        else if (!this.isProduction) {
            this.logger.debug({
                type: `CACHE_${event}`,
                key,
                duration: duration ? `${duration.toFixed(2)}ms` : undefined,
            });
        }
    }
    logResponseSize(url, sizeBytes) {
        const sizeMB = sizeBytes / (1024 * 1024);
        if (sizeMB > 1) {
            this.logger.warn({
                type: 'LARGE_RESPONSE',
                url,
                size: `${sizeMB.toFixed(2)}MB`,
                warning: 'Consider pagination or field selection',
                timestamp: new Date().toISOString(),
            });
        }
    }
    logError(context, error, additionalData) {
        this.logger.error({
            type: 'ERROR',
            context,
            message: error.message,
            stack: this.isProduction ? undefined : error.stack,
            ...additionalData,
            timestamp: new Date().toISOString(),
        });
    }
    logInfo(message, data) {
        if (!this.isProduction) {
            this.logger.log({ message, ...data });
        }
    }
};
exports.PerformanceLogger = PerformanceLogger;
exports.PerformanceLogger = PerformanceLogger = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PerformanceLogger);
//# sourceMappingURL=performance-logger.service.js.map