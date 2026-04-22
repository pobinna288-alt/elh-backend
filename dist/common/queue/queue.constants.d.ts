export declare enum QueueName {
    PAYMENT_VERIFICATION = "payment-verification",
    EMAIL = "email",
    FRAUD_DETECTION = "fraud-detection",
    ANALYTICS = "analytics",
    NOTIFICATIONS = "notifications"
}
export declare enum QueuePriority {
    LOW = 1,
    NORMAL = 5,
    HIGH = 10,
    CRITICAL = 20
}
export declare enum JobType {
    VERIFY_PAYMENT = "verify-payment",
    PROCESS_REFUND = "process-refund",
    SEND_EMAIL = "send-email",
    SEND_WELCOME_EMAIL = "send-welcome-email",
    SEND_PASSWORD_RESET = "send-password-reset",
    CHECK_FRAUD = "check-fraud",
    UPDATE_FRAUD_SCORE = "update-fraud-score",
    TRACK_EVENT = "track-event",
    GENERATE_REPORT = "generate-report",
    SEND_NOTIFICATION = "send-notification"
}
