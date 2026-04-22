import { Repository } from 'typeorm';
import { SavedSearch } from './entities/saved-search.entity';
import { PriceAlert } from './entities/price-alert.entity';
import { CreateSavedSearchDto, CreatePriceAlertDto } from './dto/alert.dto';
export declare class AlertsService {
    private savedSearchRepository;
    private priceAlertRepository;
    constructor(savedSearchRepository: Repository<SavedSearch>, priceAlertRepository: Repository<PriceAlert>);
    createSavedSearch(dto: CreateSavedSearchDto, userId: string): Promise<SavedSearch>;
    getSavedSearches(userId: string): Promise<{
        count: number;
        searches: SavedSearch[];
    }>;
    deleteSavedSearch(id: string, userId: string): Promise<{
        message: string;
    }>;
    toggleSavedSearchNotifications(id: string, userId: string): Promise<{
        message: string;
        notificationsEnabled: boolean;
    }>;
    createPriceAlert(dto: CreatePriceAlertDto, userId: string): Promise<PriceAlert>;
    getPriceAlerts(userId: string): Promise<{
        count: number;
        alerts: PriceAlert[];
    }>;
    deletePriceAlert(id: string, userId: string): Promise<{
        message: string;
    }>;
    togglePriceAlert(id: string, userId: string): Promise<{
        message: string;
        active: boolean;
    }>;
    checkPriceAlerts(): Promise<void>;
}
