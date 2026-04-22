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
exports.AiUsageLog = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let AiUsageLog = class AiUsageLog {
};
exports.AiUsageLog = AiUsageLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AiUsageLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], AiUsageLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'feature_name', default: 'negotiation_ai' }),
    __metadata("design:type", String)
], AiUsageLog.prototype, "featureName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_count', default: 0 }),
    __metadata("design:type", Number)
], AiUsageLog.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_date', type: 'date' }),
    __metadata("design:type", String)
], AiUsageLog.prototype, "usageDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AiUsageLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], AiUsageLog.prototype, "user", void 0);
exports.AiUsageLog = AiUsageLog = __decorate([
    (0, typeorm_1.Entity)('ai_usage_logs'),
    (0, typeorm_1.Unique)(['userId', 'featureName', 'usageDate']),
    (0, typeorm_1.Index)(['userId', 'featureName', 'usageDate'])
], AiUsageLog);
//# sourceMappingURL=ai-usage-log.entity.js.map