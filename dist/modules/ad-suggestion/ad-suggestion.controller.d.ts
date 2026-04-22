import { AdSuggestionService } from './ad-suggestion.service';
import { AdSuggestionDto, AdSuggestionResponseDto } from './dto/ad-suggestion.dto';
export declare class AdSuggestionController {
    private readonly adSuggestionService;
    constructor(adSuggestionService: AdSuggestionService);
    suggest(dto: AdSuggestionDto, req: any, ip: string): Promise<AdSuggestionResponseDto>;
}
