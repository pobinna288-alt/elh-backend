export declare class AdResponseDto {
    id: number;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    status: string;
    views: number;
    createdAt: Date;
    user: {
        id: number;
        username: string;
    };
    constructor(ad: any);
}
export declare class AdListItemDto {
    id: number;
    title: string;
    price: number;
    image: string;
    category: string;
    createdAt: Date;
    constructor(ad: any);
}
export declare class AdDetailsDto extends AdResponseDto {
    location?: string;
    contactInfo?: string;
    totalViews?: number;
    totalComments?: number;
    constructor(ad: any);
}
