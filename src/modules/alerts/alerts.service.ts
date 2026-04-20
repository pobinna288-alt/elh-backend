import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from './entities/saved-search.entity';
import { PriceAlert } from './entities/price-alert.entity';
import { CreateSavedSearchDto, CreatePriceAlertDto } from './dto/alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(SavedSearch)
    private savedSearchRepository: Repository<SavedSearch>,
    @InjectRepository(PriceAlert)
    private priceAlertRepository: Repository<PriceAlert>,
  ) {}

  // Saved Searches
  async createSavedSearch(dto: CreateSavedSearchDto, userId: string) {
    const savedSearch = this.savedSearchRepository.create({
      ...dto,
      userId,
    });

    return this.savedSearchRepository.save(savedSearch);
  }

  async getSavedSearches(userId: string) {
    const searches = await this.savedSearchRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return { count: searches.length, searches };
  }

  async deleteSavedSearch(id: string, userId: string) {
    const search = await this.savedSearchRepository.findOne({
      where: { id, userId },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    await this.savedSearchRepository.remove(search);
    return { message: 'Saved search deleted' };
  }

  async toggleSavedSearchNotifications(id: string, userId: string) {
    const search = await this.savedSearchRepository.findOne({
      where: { id, userId },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    search.notificationsEnabled = !search.notificationsEnabled;
    await this.savedSearchRepository.save(search);

    return {
      message: `Notifications ${search.notificationsEnabled ? 'enabled' : 'disabled'}`,
      notificationsEnabled: search.notificationsEnabled,
    };
  }

  // Price Alerts
  async createPriceAlert(dto: CreatePriceAlertDto, userId: string) {
    const alert = this.priceAlertRepository.create({
      ...dto,
      userId,
    });

    return this.priceAlertRepository.save(alert);
  }

  async getPriceAlerts(userId: string) {
    const alerts = await this.priceAlertRepository.find({
      where: { userId, active: true },
      relations: ['ad'],
      order: { createdAt: 'DESC' },
    });

    return { count: alerts.length, alerts };
  }

  async deletePriceAlert(id: string, userId: string) {
    const alert = await this.priceAlertRepository.findOne({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Price alert not found');
    }

    await this.priceAlertRepository.remove(alert);
    return { message: 'Price alert deleted' };
  }

  async togglePriceAlert(id: string, userId: string) {
    const alert = await this.priceAlertRepository.findOne({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Price alert not found');
    }

    alert.active = !alert.active;
    await this.priceAlertRepository.save(alert);

    return {
      message: `Price alert ${alert.active ? 'activated' : 'deactivated'}`,
      active: alert.active,
    };
  }

  // This method would be called by a cron job to check prices
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

        // TODO: Send notification to user
        // await this.notificationsService.notifyPriceAlert(alert.userId, alert.adId, alert.targetPrice);
      }
    }
  }
}
