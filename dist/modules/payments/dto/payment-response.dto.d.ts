export declare class PaymentResponseDto {
    id: number;
    reference: string;
    amount: number;
    status: string;
    type: string;
    createdAt: Date;
    constructor(payment: any);
}
export declare class PaymentStatusDto {
    reference: string;
    status: 'pending' | 'success' | 'failed' | 'processing';
    amount?: number;
    paidAt?: Date;
    constructor(data: any);
}
export declare class PaymentHistoryItemDto {
    reference: string;
    amount: number;
    status: string;
    date: Date;
    constructor(payment: any);
}
