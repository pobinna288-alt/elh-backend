export declare class StartConversationDto {
    adId: string;
    initialMessage?: string;
    autoSend?: boolean;
}
export declare class ConversationInitResponse {
    conversationId: string;
    productCard: {
        productName: string;
        productPrice: number;
        productCurrency: string;
        productThumbnail: string;
        sellerName: string;
        sellerId: string;
    };
    preFilledMessage: string;
    quickReplies: string[];
    sellerResponseIndicator: string;
    sellerAverageResponseTime: number;
    messageSent: boolean;
    messageId?: string;
    messages: any[];
}
