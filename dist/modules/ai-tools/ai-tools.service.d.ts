import { SmartCopywriterDto, NegotiationAiDto, CompetitorAnalyzerDto, AudienceExpansionDto, AdImproverDto, MarketSuggestionDto } from './dto/ai-tools.dto';
export declare class AiToolsService {
    smartCopywriter(dto: SmartCopywriterDto): Promise<{
        suggestions: any;
        keywords: string[];
        seoScore: number;
    }>;
    negotiationAi(dto: NegotiationAiDto): Promise<{
        strategy: string;
        counterOffer: number;
        reasoning: string;
        marketInsight: string;
        responseTemplates: string[];
    }>;
    competitorAnalyzer(dto: CompetitorAnalyzerDto): Promise<{
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
    }>;
    audienceExpansion(dto: AudienceExpansionDto): Promise<{
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
    }>;
    adImprover(dto: AdImproverDto): Promise<{
        improvedText: string;
        suggestions: string[];
    }>;
    marketSuggestion(dto: MarketSuggestionDto): Promise<{
        product: string;
        baseCategory: string;
        suggestedCategories: string[];
        suggestedLocations: string[];
        insights: string[];
    }>;
    private generateKeywords;
    private getNegotiationTemplates;
    private getRelatedCategories;
    private getSuggestedLocations;
}
