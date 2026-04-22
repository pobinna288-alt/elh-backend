"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobType = exports.QueuePriority = exports.QueueName = void 0;
var QueueName;
(function (QueueName) {
    QueueName["PAYMENT_VERIFICATION"] = "payment-verification";
    QueueName["EMAIL"] = "email";
    QueueName["FRAUD_DETECTION"] = "fraud-detection";
    QueueName["ANALYTICS"] = "analytics";
    QueueName["NOTIFICATIONS"] = "notifications";
})(QueueName || (exports.QueueName = QueueName = {}));
var QueuePriority;
(function (QueuePriority) {
    QueuePriority[QueuePriority["LOW"] = 1] = "LOW";
    QueuePriority[QueuePriority["NORMAL"] = 5] = "NORMAL";
    QueuePriority[QueuePriority["HIGH"] = 10] = "HIGH";
    QueuePriority[QueuePriority["CRITICAL"] = 20] = "CRITICAL";
})(QueuePriority || (exports.QueuePriority = QueuePriority = {}));
var JobType;
(function (JobType) {
    JobType["VERIFY_PAYMENT"] = "verify-payment";
    JobType["PROCESS_REFUND"] = "process-refund";
    JobType["SEND_EMAIL"] = "send-email";
    JobType["SEND_WELCOME_EMAIL"] = "send-welcome-email";
    JobType["SEND_PASSWORD_RESET"] = "send-password-reset";
    JobType["CHECK_FRAUD"] = "check-fraud";
    JobType["UPDATE_FRAUD_SCORE"] = "update-fraud-score";
    JobType["TRACK_EVENT"] = "track-event";
    JobType["GENERATE_REPORT"] = "generate-report";
    JobType["SEND_NOTIFICATION"] = "send-notification";
})(JobType || (exports.JobType = JobType = {}));
//# sourceMappingURL=queue.constants.js.map