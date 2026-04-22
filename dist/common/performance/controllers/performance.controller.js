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
exports.PerformanceController = void 0;
const common_1 = require("@nestjs/common");
const performance_service_1 = require("../services/performance.service");
const jwt_auth_guard_1 = require("../../../modules/auth/guards/jwt-auth.guard");
let PerformanceController = class PerformanceController {
    constructor(performanceService) {
        this.performanceService = performanceService;
    }
    getStats() {
        return {
            message: 'Performance Statistics',
            timestamp: new Date().toISOString(),
            stats: this.performanceService.getStats(),
            info: {
                description: 'Endpoint performance metrics',
                metrics: {
                    count: 'Number of requests',
                    avg: 'Average response time (ms)',
                    p50: 'Median response time (ms)',
                    p95: '95th percentile response time (ms)',
                    p99: '99th percentile response time (ms)',
                    min: 'Fastest response time (ms)',
                    max: 'Slowest response time (ms)',
                },
            },
        };
    }
    getHealth() {
        const stats = this.performanceService.getStats();
        const slowEndpoints = Object.entries(stats)
            .filter(([_, metrics]) => metrics.avg > 1000)
            .map(([endpoint, metrics]) => ({ endpoint, metrics }));
        return {
            status: slowEndpoints.length > 0 ? 'warning' : 'healthy',
            timestamp: new Date().toISOString(),
            slowEndpoints: slowEndpoints.length > 0 ? slowEndpoints : undefined,
            message: slowEndpoints.length > 0
                ? 'Some endpoints are experiencing slow response times'
                : 'All endpoints performing normally',
        };
    }
};
exports.PerformanceController = PerformanceController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getHealth", null);
exports.PerformanceController = PerformanceController = __decorate([
    (0, common_1.Controller)('performance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService])
], PerformanceController);
//# sourceMappingURL=performance.controller.js.map