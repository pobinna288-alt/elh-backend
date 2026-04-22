"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const streak_controller_1 = require("./streak.controller");
const streak_service_1 = require("./streak.service");
const streak_entity_1 = require("./entities/streak.entity");
const notifications_module_1 = require("../notifications/notifications.module");
let StreakModule = class StreakModule {
};
exports.StreakModule = StreakModule;
exports.StreakModule = StreakModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([streak_entity_1.Streak]),
            notifications_module_1.NotificationsModule,
        ],
        controllers: [streak_controller_1.StreakController],
        providers: [streak_service_1.StreakService],
        exports: [streak_service_1.StreakService],
    })
], StreakModule);
//# sourceMappingURL=streak.module.js.map