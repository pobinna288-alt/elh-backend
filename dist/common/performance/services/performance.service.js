"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
let PerformanceService = class PerformanceService {
    constructor() {
        this.requestTimings = new Map();
        this.SLOW_REQUEST_THRESHOLD = 1000;
    }
    startTimer(label) {
        const startTime = process.hrtime.bigint();
        return () => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1_000_000;
            if (!this.requestTimings.has(label)) {
                this.requestTimings.set(label, []);
            }
            const timings = this.requestTimings.get(label);
            timings.push(duration);
            if (timings.length > 100) {
                timings.shift();
            }
            return duration;
        };
    }
    isSlowOperation(duration) {
        return duration > this.SLOW_REQUEST_THRESHOLD;
    }
    getAverageTiming(label) {
        const timings = this.requestTimings.get(label);
        if (!timings || timings.length === 0)
            return null;
        const sum = timings.reduce((a, b) => a + b, 0);
        return sum / timings.length;
    }
    getStats() {
        const stats = {};
        for (const [label, timings] of this.requestTimings.entries()) {
            if (timings.length === 0)
                continue;
            const sorted = [...timings].sort((a, b) => a - b);
            const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
            const p50 = sorted[Math.floor(sorted.length * 0.5)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            const p99 = sorted[Math.floor(sorted.length * 0.99)];
            stats[label] = {
                count: timings.length,
                avg: Math.round(avg * 100) / 100,
                p50: Math.round(p50 * 100) / 100,
                p95: Math.round(p95 * 100) / 100,
                p99: Math.round(p99 * 100) / 100,
                min: Math.round(sorted[0] * 100) / 100,
                max: Math.round(sorted[sorted.length - 1] * 100) / 100,
            };
        }
        return stats;
    }
    clearStats() {
        this.requestTimings.clear();
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)()
], PerformanceService);
//# sourceMappingURL=performance.service.js.map