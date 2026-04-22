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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const saved_search_entity_1 = require("./entities/saved-search.entity");
const price_alert_entity_1 = require("./entities/price-alert.entity");
let AlertsService = class AlertsService {
    constructor(savedSearchRepository, priceAlertRepository) {
        this.savedSearchRepository = savedSearchRepository;
        this.priceAlertRepository = priceAlertRepository;
    }
    async createSavedSearch(dto, userId) {
        const savedSearch = this.savedSearchRepository.create({
            ...dto,
            userId,
        });
        return this.savedSearchRepository.save(savedSearch);
    }
    async getSavedSearches(userId) {
        const searches = await this.savedSearchRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        return { count: searches.length, searches };
    }
    async deleteSavedSearch(id, userId) {
        const search = await this.savedSearchRepository.findOne({
            where: { id, userId },
        });
        if (!search) {
            throw new common_1.NotFoundException('Saved search not found');
        }
        await this.savedSearchRepository.remove(search);
        return { message: 'Saved search deleted' };
    }
    async toggleSavedSearchNotifications(id, userId) {
        const search = await this.savedSearchRepository.findOne({
            where: { id, userId },
        });
        if (!search) {
            throw new common_1.NotFoundException('Saved search not found');
        }
        search.notificationsEnabled = !search.notificationsEnabled;
        await this.savedSearchRepository.save(search);
        return {
            message: `Notifications ${search.notificationsEnabled ? 'enabled' : 'disabled'}`,
            notificationsEnabled: search.notificationsEnabled,
        };
    }
    async createPriceAlert(dto, userId) {
        const alert = this.priceAlertRepository.create({
            ...dto,
            userId,
        });
        return this.priceAlertRepository.save(alert);
    }
    async getPriceAlerts(userId) {
        const alerts = await this.priceAlertRepository.find({
            where: { userId, active: true },
            relations: ['ad'],
            order: { createdAt: 'DESC' },
        });
        return { count: alerts.length, alerts };
    }
    async deletePriceAlert(id, userId) {
        const alert = await this.priceAlertRepository.findOne({
            where: { id, userId },
        });
        if (!alert) {
            throw new common_1.NotFoundException('Price alert not found');
        }
        await this.priceAlertRepository.remove(alert);
        return { message: 'Price alert deleted' };
    }
    async togglePriceAlert(id, userId) {
        const alert = await this.priceAlertRepository.findOne({
            where: { id, userId },
        });
        if (!alert) {
            throw new common_1.NotFoundException('Price alert not found');
        }
        alert.active = !alert.active;
        await this.priceAlertRepository.save(alert);
        return {
            message: `Price alert ${alert.active ? 'activated' : 'deactivated'}`,
            active: alert.active,
        };
    }
    async checkPriceAlerts() {
        const activeAlerts = await this.priceAlertRepository.find({
            where: { active: true, triggered: false },
            relations: ['ad'],
        });
        for (const alert of activeAlerts) {
            if (alert.ad.price <= alert.targetPrice) {
                alert.triggered = true;
                alert.triggeredAt = new Date();
                await this.priceAlertRepository.save(alert);
            }
        }
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(saved_search_entity_1.SavedSearch)),
    __param(1, (0, typeorm_1.InjectRepository)(price_alert_entity_1.PriceAlert)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map