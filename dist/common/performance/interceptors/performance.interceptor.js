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
exports.PerformanceInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const performance_service_1 = require("../services/performance.service");
const performance_logger_service_1 = require("../services/performance-logger.service");
let PerformanceInterceptor = class PerformanceInterceptor {
    constructor(performanceService, performanceLogger) {
        this.performanceService = performanceService;
        this.performanceLogger = performanceLogger;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const label = `${method} ${url.split('?')[0]}`;
        const stopTimer = this.performanceService.startTimer(label);
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const duration = stopTimer();
                const response = context.switchToHttp().getResponse();
                this.performanceLogger.logSlowRequest(method, url, duration, response.statusCode);
            },
            error: (error) => {
                const duration = stopTimer();
                this.performanceLogger.logError('Request Error', error, { method, url, duration });
            },
        }));
    }
};
exports.PerformanceInterceptor = PerformanceInterceptor;
exports.PerformanceInterceptor = PerformanceInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService,
        performance_logger_service_1.PerformanceLogger])
], PerformanceInterceptor);
//# sourceMappingURL=performance.interceptor.js.map