"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTransactionDto = exports.WalletResponseDto = void 0;
class WalletResponseDto {
    constructor(wallet) {
        this.balance = wallet.balance || 0;
        this.currency = wallet.currency || 'NGN';
        this.lastUpdated = wallet.updatedAt;
    }
}
exports.WalletResponseDto = WalletResponseDto;
class WalletTransactionDto {
    constructor(transaction) {
        this.id = transaction.id;
        this.type = transaction.type;
        this.amount = transaction.amount;
        this.balance = transaction.balance;
        this.reference = transaction.reference;
        this.description = transaction.description;
        this.createdAt = transaction.createdAt;
    }
}
exports.WalletTransactionDto = WalletTransactionDto;
//# sourceMappingURL=wallet-response.dto.js.map