import { AiToolsService } from './ai-tools.service';
import { SmartCopywriterDto, NegotiationAiDto, CompetitorAnalyzerDto, AudienceExpansionDto, AdImproverDto, MarketSuggestionDto } from './dto/ai-tools.dto';
import { AiUsageService } from './ai-usage.service';
import { NegotiationAIService } from '../negotiation-ai/services/negotiation-ai.service';
export declare class AiToolsController {
    private readonly aiToolsService;
    private readonly aiUsageService;
    private readonly negotiationAIService;
    constructor(aiToolsService: AiToolsService, aiUsageService: AiUsageService, negotiationAIService: NegotiationAIService);
    smartCopywriter(dto: SmartCopywriterDto, req: any): Promise<{
        result: {
            suggestions: any;
            keywords: string[];
            seoScore: number;
        };
        tool_used: string;
        remaining_daily_usage: number;
    }>;
    negotiationAi(dto: NegotiationAiDto, req: any): Promise<{
        result: any;
        tool_used: string;
        remaining_daily_usage: number | "unlimited";
        daily_used: number;
        daily_limit: number | "unlimited";
    }>;
    competitorAnalyzer(dto: CompetitorAnalyzerDto, req: any): Promise<{
        result: {
            category: string;
            yourPrice: number;
            competitorData: {
                totalCompetitors: number;
                averagePrice: number;
                lowestPrice: number;
                highestPrice: number;
            };
            positioning: string;
            recommendations: string[];
            trendsInsight: string;
        };
        tool_used: string;
        remaining_daily_usage: number;
    }>;
    audienceExpansion(dto: AudienceExpansionDto, req: any): Promise<{
        result: {
            currentReach: {
                category: string;
                locations: string[];
                estimatedAudience: number;
            };
            expansionOpportunities: {
                categories: string[];
                locations: string[];
                potentialAudience: number;
            };
            recommendations: string[];
        };
        tool_used: string;
        remaining_daily_usage: number;
    }>;
    adImprover(dto: AdImproverDto, req: any): Promise<{
        result: {
            improvedText: string;
            suggestions: string[];
        };
        tool_used: string;
        remaining_daily_usage: number;
    }>;
    marketSuggestion(dto: MarketSuggestionDto, req: any): Promise<{
        result: {
            product: string;
            baseCategory: string;
            suggestedCategories: string[];
            suggestedLocations: string[];
            insights: string[];
        };
        tool_used: string;
        remaining_daily_usage: number;
    }>;
}
