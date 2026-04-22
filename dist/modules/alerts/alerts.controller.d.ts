import { AlertsService } from './alerts.service';
import { CreateSavedSearchDto, CreatePriceAlertDto } from './dto/alert.dto';
export declare class AlertsController {
    private readonly alertsService;
    constructor(alertsService: AlertsService);
    createSavedSearch(dto: CreateSavedSearchDto, req: any): Promise<import("./entities/saved-search.entity").SavedSearch>;
    getSavedSearches(req: any): Promise<{
        count: number;
        searches: import("./entities/saved-search.entity").SavedSearch[];
    }>;
    deleteSavedSearch(id: string, req: any): Promise<{
        message: string;
    }>;
    toggleSavedSearchNotifications(id: string, req: any): Promise<{
        message: string;
        notificationsEnabled: boolean;
    }>;
    createPriceAlert(dto: CreatePriceAlertDto, req: any): Promise<import("./entities/price-alert.entity").PriceAlert>;
    getPriceAlerts(req: any): Promise<{
        count: number;
        alerts: import("./entities/price-alert.entity").PriceAlert[];
    }>;
    deletePriceAlert(id: string, req: any): Promise<{
        message: string;
    }>;
    togglePriceAlert(id: string, req: any): Promise<{
        message: string;
        active: boolean;
    }>;
}
