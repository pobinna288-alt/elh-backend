/**
 * Queue Names
 * 
 * Centralized queue names for the application
 */
export enum QueueName {
  PAYMENT_VERIFICATION = 'payment-verification',
  EMAIL = 'email',
  FRAUD_DETECTION = 'fraud-detection',
  ANALYTICS = 'analytics',
  NOTIFICATIONS = 'notifications',
}

/**
 * Queue Priorities
 * 
 * Higher number = higher priority
 */
export enum QueuePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

/**
 * Job Types
 */
export enum JobType {
  // Payment jobs
  VERIFY_PAYMENT = 'verify-payment',
  PROCESS_REFUND = 'process-refund',
  
  // Email jobs
  SEND_EMAIL = 'send-email',
  SEND_WELCOME_EMAIL = 'send-welcome-email',
  SEND_PASSWORD_RESET = 'send-password-reset',
  
  // Fraud detection jobs
  CHECK_FRAUD = 'check-fraud',
  UPDATE_FRAUD_SCORE = 'update-fraud-score',
  
  // Analytics jobs
  TRACK_EVENT = 'track-event',
  GENERATE_REPORT = 'generate-report',
  
  // Notification jobs
  SEND_NOTIFICATION = 'send-notification',
}
