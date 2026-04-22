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
exports.ApiKeyGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const performance_logger_service_1 = require("../../performance/services/performance-logger.service");
let ApiKeyGuard = class ApiKeyGuard {
    constructor(configService, performanceLogger) {
        this.configService = configService;
        this.performanceLogger = performanceLogger;
        this.apiKey = this.configService.get('API_KEY');
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-api-key'];
        if (!providedKey || providedKey !== this.apiKey) {
            this.performanceLogger.logError('Invalid API Key', new Error('API key validation failed'), { ip: request.ip });
            throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.UNAUTHORIZED);
        }
        return true;
    }
};
exports.ApiKeyGuard = ApiKeyGuard;
exports.ApiKeyGuard = ApiKeyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        performance_logger_service_1.PerformanceLogger])
], ApiKeyGuard);
//# sourceMappingURL=api-key.guard.js.map