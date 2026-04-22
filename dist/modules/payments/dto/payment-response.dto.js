"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentHistoryItemDto = exports.PaymentStatusDto = exports.PaymentResponseDto = void 0;
class PaymentResponseDto {
    constructor(payment) {
        this.id = payment.id;
        this.reference = payment.reference;
        this.amount = payment.amount;
        this.status = payment.status;
        this.type = payment.type;
        this.createdAt = payment.createdAt;
    }
}
exports.PaymentResponseDto = PaymentResponseDto;
class PaymentStatusDto {
    constructor(data) {
        this.reference = data.reference;
        this.status = data.status;
        this.amount = data.amount;
        this.paidAt = data.paidAt;
    }
}
exports.PaymentStatusDto = PaymentStatusDto;
class PaymentHistoryItemDto {
    constructor(payment) {
        this.reference = payment.reference;
        this.amount = payment.amount;
        this.status = payment.status;
        this.date = payment.createdAt;
    }
}
exports.PaymentHistoryItemDto = PaymentHistoryItemDto;
//# sourceMappingURL=payment-response.dto.js.map