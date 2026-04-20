/**
 * Optimized Wallet Response DTO
 * 
 * Returns wallet data with minimal fields
 */
export class WalletResponseDto {
  balance: number;
  currency: string;
  lastUpdated: Date;

  constructor(wallet: any) {
    this.balance = wallet.balance || 0;
    this.currency = wallet.currency || 'NGN';
    this.lastUpdated = wallet.updatedAt;
  }
}

/**
 * Wallet Transaction DTO
 */
export class WalletTransactionDto {
  id: number;
  type: string;
  amount: number;
  balance: number; // Balance after transaction
  reference: string;
  description: string;
  createdAt: Date;

  constructor(transaction: any) {
    this.id = transaction.id;
    this.type = transaction.type;
    this.amount = transaction.amount;
    this.balance = transaction.balance;
    this.reference = transaction.reference;
    this.description = transaction.description;
    this.createdAt = transaction.createdAt;
  }
}
