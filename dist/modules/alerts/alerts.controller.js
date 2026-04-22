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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsController = void 0;
const common_1 = require("@nestjs/common");
const alerts_service_1 = require("./alerts.service");
const alert_dto_1 = require("./dto/alert.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let AlertsController = class AlertsController {
    constructor(alertsService) {
        this.alertsService = alertsService;
    }
    createSavedSearch(dto, req) {
        return this.alertsService.createSavedSearch(dto, req.user.id);
    }
    getSavedSearches(req) {
        return this.alertsService.getSavedSearches(req.user.id);
    }
    deleteSavedSearch(id, req) {
        return this.alertsService.deleteSavedSearch(id, req.user.id);
    }
    toggleSavedSearchNotifications(id, req) {
        return this.alertsService.toggleSavedSearchNotifications(id, req.user.id);
    }
    createPriceAlert(dto, req) {
        return this.alertsService.createPriceAlert(dto, req.user.id);
    }
    getPriceAlerts(req) {
        return this.alertsService.getPriceAlerts(req.user.id);
    }
    deletePriceAlert(id, req) {
        return this.alertsService.deletePriceAlert(id, req.user.id);
    }
    togglePriceAlert(id, req) {
        return this.alertsService.togglePriceAlert(id, req.user.id);
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.Post)('saved-searches'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a saved search' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [alert_dto_1.CreateSavedSearchDto, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "createSavedSearch", null);
__decorate([
    (0, common_1.Get)('saved-searches'),
    (0, swagger_1.ApiOperation)({ summary: 'Get saved searches' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "getSavedSearches", null);
__decorate([
    (0, common_1.Delete)('saved-searches/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a saved search' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "deleteSavedSearch", null);
__decorate([
    (0, common_1.Patch)('saved-searches/:id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle saved search notifications' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "toggleSavedSearchNotifications", null);
__decorate([
    (0, common_1.Post)('price-alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a price alert' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [alert_dto_1.CreatePriceAlertDto, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "createPriceAlert", null);
__decorate([
    (0, common_1.Get)('price-alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get price alerts' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "getPriceAlerts", null);
__decorate([
    (0, common_1.Delete)('price-alerts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a price alert' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "deletePriceAlert", null);
__decorate([
    (0, common_1.Patch)('price-alerts/:id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle price alert' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "togglePriceAlert", null);
exports.AlertsController = AlertsController = __decorate([
    (0, swagger_1.ApiTags)('alerts'),
    (0, common_1.Controller)('alerts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [alerts_service_1.AlertsService])
], AlertsController);
//# sourceMappingURL=alerts.controller.js.map