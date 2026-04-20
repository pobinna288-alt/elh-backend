/**
 * Optimized Payment Response DTO
 * 
 * Returns only necessary payment fields
 */
export class PaymentResponseDto {
  id: number;
  reference: string;
  amount: number;
  status: string;
  type: string;
  createdAt: Date;

  // Exclude: internal tracking fields, user sensitive data

  constructor(payment: any) {
    this.id = payment.id;
    this.reference = payment.reference;
    this.amount = payment.amount;
    this.status = payment.status;
    this.type = payment.type;
    this.createdAt = payment.createdAt;
  }
}

/**
 * Payment Status DTO
 * For quick status checks
 */
export class PaymentStatusDto {
  reference: string;
  status: 'pending' | 'success' | 'failed' | 'processing';
  amount?: number;
  paidAt?: Date;

  constructor(data: any) {
    this.reference = data.reference;
    this.status = data.status;
    this.amount = data.amount;
    this.paidAt = data.paidAt;
  }
}

/**
 * Payment History Item DTO
 * Minimal info for payment lists
 */
export class PaymentHistoryItemDto {
  reference: string;
  amount: number;
  status: string;
  date: Date;

  constructor(payment: any) {
    this.reference = payment.reference;
    this.amount = payment.amount;
    this.status = payment.status;
    this.date = payment.createdAt;
  }
}
