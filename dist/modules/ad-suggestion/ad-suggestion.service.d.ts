import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdSuggestionLog } from './entities/ad-suggestion-log.entity';
interface SuggestedCopy {
    suggestedTitle?: string;
    suggestedDescription?: string;
}
interface SuggestionResult {
    originalTitle: string | null;
    originalDescription: string | null;
    suggestions: SuggestedCopy[];
    notice: string;
}
export declare class AdSuggestionService {
    private readonly logRepository;
    private readonly configService;
    private readonly logger;
    constructor(logRepository: Repository<AdSuggestionLog>, configService: ConfigService);
    suggest(title: string | undefined, description: string | undefined, category?: string, targetAudience?: string, userId?: string, userPlan?: string, ipAddress?: string): Promise<SuggestionResult>;
    private generateWithOpenAI;
    private generateWithTemplates;
    private logRequest;
    private capitalize;
}
export {};
