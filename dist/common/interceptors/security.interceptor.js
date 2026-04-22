"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let SecurityInterceptor = class SecurityInterceptor {
    constructor() {
        this.logger = new common_1.Logger('SecurityInterceptor');
        this.sensitiveFields = [
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
    }
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)(data => {
            if (typeof data !== 'object' || data === null) {
                return data;
            }
            return this.sanitizeResponse(data);
        }));
    }
    sanitizeResponse(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeResponse(item));
        }
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (this.isSensitiveField(key)) {
                        this.logger.warn(`⚠️  Blocked sensitive field from response: ${key}`);
                        continue;
                    }
                    sanitized[key] = this.sanitizeResponse(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    }
    isSensitiveField(fieldName) {
        const lowerField = fieldName.toLowerCase();
        return this.sensitiveFields.some(sensitive => lowerField.includes(sensitive.toLowerCase()));
    }
};
exports.SecurityInterceptor = SecurityInterceptor;
exports.SecurityInterceptor = SecurityInterceptor = __decorate([
    (0, common_1.Injectable)()
], SecurityInterceptor);
//# sourceMappingURL=security.interceptor.js.map