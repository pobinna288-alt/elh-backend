import { AdWatchService } from './ad-watch.service';
import { AdProgressDto, StartWatchSessionDto, AdProgressResponseDto, WatchSessionResponseDto, AdCompletionResponseDto, WatchStatsResponseDto } from './dto/ad-watch.dto';
export declare class AdWatchController {
    private readonly adWatchService;
    constructor(adWatchService: AdWatchService);
    startWatchSession(dto: StartWatchSessionDto, req: any): Promise<WatchSessionResponseDto>;
    reportProgress(dto: AdProgressDto, req: any): Promise<AdProgressResponseDto>;
    reportProgressLegacy(dto: AdProgressDto, req: any): Promise<AdProgressResponseDto>;
    getWatchStats(req: any): Promise<WatchStatsResponseDto>;
    getAdStatus(adId: string, req: any): Promise<AdCompletionResponseDto>;
}
