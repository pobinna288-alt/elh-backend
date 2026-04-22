export declare class AdSuggestionDto {
    title?: string;
    description?: string;
    category?: string;
    targetAudience?: string;
}
export declare class SuggestedAdCopy {
    suggestedTitle?: string;
    suggestedDescription?: string;
}
export declare class AdSuggestionResponseDto {
    originalTitle: string | null;
    originalDescription: string | null;
    suggestions: SuggestedAdCopy[];
    notice: string;
}
