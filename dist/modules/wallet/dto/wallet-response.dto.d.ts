export declare class WalletResponseDto {
    balance: number;
    currency: string;
    lastUpdated: Date;
    constructor(wallet: any);
}
export declare class WalletTransactionDto {
    id: number;
    type: string;
    amount: number;
    balance: number;
    reference: string;
    description: string;
    createdAt: Date;
    constructor(transaction: any);
}
