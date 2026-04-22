import { DescriptionPlan } from '../ai-description.service';
export declare class GenerateDescriptionDto {
    title: string;
    category: string;
    price: number;
    location: string;
    plan: DescriptionPlan;
    additionalInfo?: string;
}
export declare class DescriptionResponseDto {
    description: string;
    wordCount: number;
    plan: DescriptionPlan;
}
