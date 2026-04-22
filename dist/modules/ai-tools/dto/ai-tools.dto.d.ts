export declare class SmartCopywriterDto {
    productName: string;
    category: string;
    targetAudience?: string;
    tone?: string;
}
export declare class NegotiationAiDto {
    originalPrice: number;
    offeredPrice: number;
    productCategory: string;
}
export declare class CompetitorAnalyzerDto {
    category: string;
    yourPrice: number;
    location?: string;
}
export declare class AudienceExpansionDto {
    currentCategory: string;
    currentLocations: string[];
}
export declare class AdImproverDto {
    currentText: string;
    title?: string;
}
export declare class MarketSuggestionDto {
    productName: string;
    category: string;
    currentLocations?: string[];
}
