const axios = require("axios");
const { randomBytes, randomUUID } = require("crypto");
const { activateConnectionAfterPayment } = require("../../services/instantConnectionSearchService");

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_TIMEOUT_MS = 10000;
const VERIFYING_REFERENCES = new Set();
const TX_TYPE = "paystack_payment";

function createHttpError(statusCode, message, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function ensurePaymentCollections(database) {
  if (!Array.isArray(database.transactions)) {
    database.transactions = [];
  }
  if (!Array.isArray(database.users)) {
    database.users = [];
  }
  if (!Array.isArray(database.connectionRequests)) {
    database.connectionRequests = [];
  }
  if (!Array.isArray(database.paymentVerificationAttempts)) {
    database.paymentVerificationAttempts = [];
  }
}

function normalizeAmountToKobo(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const kobo = Math.round(parsed * 100);
  return kobo > 0 ? kobo : null;
}

function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function getPaystackSecretKey() {
  const secret = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!secret) {
    const error = createHttpError(503, "PAYSTACK_SECRET_KEY is not configured");
    error.retryable = false;
    throw error;
  }
  if (!secret.startsWith("sk_")) {
    const error = createHttpError(503, "PAYSTACK_SECRET_KEY format is invalid");
    error.retryable = false;
    throw error;
  }
  return secret;
}

function buildUniqueReference(database) {
  let reference = "";
  do {
    const entropy = randomBytes(10).toString("hex");
    reference = `elh_pay_${Date.now()}_${entropy}`;
  } while (database.transactions.some((entry) => entry.reference === reference));

  return reference;
}

function nowIso() {
  return new Date().toISOString();
}

function toStructuredError({ statusCode, message, retryable = false, details }) {
  const error = createHttpError(statusCode, message, details);
  error.retryable = Boolean(retryable);
  return error;
}

function toActivationPlan(planRaw) {
  const normalized = `${planRaw || "premium"}`.trim().toLowerCase();
  if (
    normalized === "premium" ||
    normalized === "pro" ||
    normalized === "hot" ||
    normalized === "enterprise" ||
    normalized === "starter"
  ) {
    return normalized;
  }
  return "premium";
}

function normalizeDurationDays(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.min(Math.max(Math.round(parsed), 1), 3650);
}

function activateUserFeatures({ database, transaction, createNotification }) {
  const userIndex = database.users.findIndex((entry) => entry?.id === transaction.userId);
  if (userIndex === -1) {
    return {
      success: false,
      message: "User not found for post-payment activation",
      statusCode: 404,
      retryable: false,
    };
  }

  const user = database.users[userIndex];
  const plan = toActivationPlan(transaction.plan);
  const durationDays = normalizeDurationDays(transaction.planDurationDays);
  const currentExpiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
  const now = new Date();
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;

  user.isPremium = true;
  user.subscriptionPlan = plan;
  user.subscriptionLevel = plan;
  user.premiumActivatedAt = user.premiumActivatedAt || nowIso();
  user.premiumExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  user.updatedAt = new Date();

  database.users[userIndex] = user;

  if (typeof createNotification === "function") {
    createNotification({
      userId: user.id,
      type: "system",
      title: "Payment confirmed",
      message: `Your ${plan} access is active.`,
      metadata: {
        event: "paystack_payment_verified",
        reference: transaction.reference,
        plan,
      },
    });
  }

  return {
    success: true,
    userId: user.id,
    plan,
    premiumExpiresAt: user.premiumExpiresAt,
  };
}

function appendVerificationAudit(database, payload) {
  database.paymentVerificationAttempts.push({
    id: randomUUID(),
    createdAt: new Date(),
    ...payload,
  });
}

function isNetworkOrUpstreamRetryable(error) {
  const status = Number(error?.response?.status);
  const code = `${error?.code || ""}`.toUpperCase();
  if (status >= 500) {
    return true;
  }
  return (
    code === "ECONNABORTED" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    code === "EAI_AGAIN" ||
    code === "ETIMEDOUT"
  );
}

function createPaymentsService({ database, createNotification, onPaymentActivated }) {
  ensurePaymentCollections(database);

  async function initializePayment(payload = {}) {
    const secretKey = getPaystackSecretKey();
    const email = (payload.email || "").toString().trim().toLowerCase();
    const userId = (payload.userId || "").toString().trim();
    const amountKobo = normalizeAmountToKobo(payload.amount);
    const connectionId = (payload.connectionId || "").toString().trim() || null;
    const plan = toActivationPlan(payload?.plan?.name || payload?.planName || payload?.plan || "premium");
    const planDurationDays = normalizeDurationDays(payload?.plan?.durationDays || payload?.durationDays);

    if (!isValidEmail(email)) {
      throw toStructuredError({
        statusCode: 400,
        message: "A valid email is required",
        retryable: false,
      });
    }
    if (!userId) {
      throw toStructuredError({
        statusCode: 400,
        message: "userId is required",
        retryable: false,
      });
    }
    if (!database.users.some((entry) => entry?.id === userId)) {
      throw toStructuredError({
        statusCode: 404,
        message: "User not found",
        retryable: false,
      });
    }
    if (!Number.isFinite(amountKobo)) {
      throw toStructuredError({
        statusCode: 400,
        message: "amount must be a positive number",
        retryable: false,
      });
    }

    if (connectionId) {
      const connection = database.connectionRequests.find((entry) => entry.id === connectionId);
      if (!connection) {
        throw toStructuredError({
          statusCode: 400,
          message: "Unknown connectionId",
          retryable: false,
        });
      }
    }

    const reference = buildUniqueReference(database);
    const transaction = {
      id: randomUUID(),
      type: TX_TYPE,
      gateway: "paystack",
      reference,
      userId,
      email,
      connectionId,
      plan,
      planDurationDays,
      expected_amount_kobo: amountKobo,
      currency: "NGN",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      verification_attempts: 0,
      processing_locked: false,
      processed_at: null,
      paystack_response: null,
      paystack_verify_response: null,
      failure_reason: null,
    };

    database.transactions.push(transaction);

    try {
      const paystackPayload = {
        email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        metadata: {
          userId,
          connectionId,
          plan,
          planDurationDays,
          transactionId: transaction.id,
          flow: "payment_activation",
        },
      };

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        paystackPayload,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          timeout: PAYSTACK_TIMEOUT_MS,
        }
      );

      const paystackData = response?.data?.data;
      if (!response?.data?.status || !paystackData?.authorization_url || !paystackData?.reference) {
        throw toStructuredError({
          statusCode: 502,
          message: "Invalid response from Paystack initialize API",
          retryable: true,
        });
      }

      transaction.paystack_response = {
        authorization_url: paystackData.authorization_url,
        access_code: paystackData.access_code || null,
        reference: paystackData.reference,
      };
      transaction.updatedAt = new Date();

      return {
        status: "success",
        message: "Payment initialized",
        data: {
          authorization_url: paystackData.authorization_url,
          reference,
        },
      };
    } catch (error) {
      transaction.status = "failed";
      transaction.failure_reason = error?.response?.data?.message || error.message || "Initialization failed";
      transaction.updatedAt = new Date();

      if (error.statusCode) {
        throw error;
      }

      if (
        error?.code === "ECONNABORTED" ||
        error?.code === "ETIMEDOUT"
      ) {
        throw toStructuredError({
          statusCode: 504,
          message: "Payment service timeout",
          retryable: true,
        });
      }

      const apiMessage = error?.response?.data?.message;
      throw toStructuredError({
        statusCode: 502,
        message: apiMessage || "Payment initialization failed",
        retryable: true,
      });
    }
  }

  function getReferenceTransaction(reference) {
    return database.transactions.find(
      (entry) => entry.reference === reference && entry.type === TX_TYPE
    );
  }

  function markVerificationFailed(transaction, reason, paystackData = null, lock = true) {
    transaction.status = "failed";
    transaction.failure_reason = reason;
    transaction.processing_locked = lock;
    transaction.processed_at = nowIso();
    transaction.updatedAt = new Date();
    if (paystackData) {
      transaction.paystack_verify_response = paystackData;
    }
  }

  async function verifyPayment(referenceRaw) {
    const secretKey = getPaystackSecretKey();
    const reference = (referenceRaw || "").toString().trim();

    if (!reference) {
      throw toStructuredError({
        statusCode: 400,
        message: "Payment reference is required",
        retryable: false,
      });
    }

    const transaction = getReferenceTransaction(reference);
    if (!transaction) {
      appendVerificationAudit(database, {
        reference,
        outcome: "unknown_reference",
        retryable: false,
      });
      throw toStructuredError({
        statusCode: 404,
        message: "Unknown payment reference",
        retryable: false,
      });
    }

    if (transaction.processing_locked) {
      const paid = transaction.status === "success";
      appendVerificationAudit(database, {
        reference,
        transactionId: transaction.id,
        outcome: paid ? "already_success" : "already_failed",
        retryable: false,
      });
      return {
        status: paid ? "success" : "failed",
        message: paid ? "Payment already verified" : "Payment not confirmed",
        already_processed: true,
        payment_status: transaction.status,
        payment: {
          reference: transaction.reference,
          expected_amount_kobo: transaction.expected_amount_kobo,
          processed_at: transaction.processed_at,
        },
        activation: transaction.activation || null,
        statusCode: paid ? 200 : 409,
      };
    }

    if (VERIFYING_REFERENCES.has(reference)) {
      appendVerificationAudit(database, {
        reference,
        transactionId: transaction.id,
        outcome: "duplicate_in_flight",
        retryable: true,
      });
      return {
        status: "error",
        message: "Duplicate verification request in progress",
        retryable: true,
        statusCode: 409,
      };
    }

    VERIFYING_REFERENCES.add(reference);
    transaction.verification_attempts = (transaction.verification_attempts || 0) + 1;
    transaction.status = "verifying";
    transaction.updatedAt = new Date();

    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          timeout: PAYSTACK_TIMEOUT_MS,
        }
      );

      const paystackData = response?.data?.data;
      if (!response?.data?.status || !paystackData) {
        markVerificationFailed(transaction, "Invalid verification response from Paystack", null, false);
        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "invalid_verify_payload",
          retryable: true,
        });
        return {
          status: "error",
          message: "Failed to verify payment",
          retryable: true,
          payment: {
            reference: transaction.reference,
            status: transaction.status,
          },
          statusCode: 502,
        };
      }

      const paystackStatus = (paystackData.status || "").toString().toLowerCase();
      const paidAmountKobo = Number(paystackData.amount);
      const paystackCurrency = `${paystackData.currency || ""}`.trim().toUpperCase();
      const paystackReference = `${paystackData.reference || ""}`.trim();

      if (paystackReference !== reference) {
        markVerificationFailed(transaction, "Reference mismatch from Paystack", paystackData);
        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "reference_mismatch",
          retryable: false,
        });
        return {
          status: "failed",
          message: "Payment not confirmed",
          retryable: false,
          statusCode: 400,
        };
      }

      if (paystackCurrency !== "NGN") {
        markVerificationFailed(transaction, "Currency mismatch", paystackData);
        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "currency_mismatch",
          retryable: false,
        });
        return {
          status: "failed",
          message: "Payment not confirmed",
          retryable: false,
          statusCode: 400,
        };
      }

      if (paystackStatus !== "success") {
        markVerificationFailed(transaction, `Paystack status is ${paystackStatus}`, paystackData);
        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "paystack_not_success",
          retryable: false,
          paystackStatus,
        });
        return {
          status: "failed",
          message: "Payment not confirmed",
          retryable: false,
          statusCode: 400,
        };
      }

      if (!Number.isFinite(paidAmountKobo) || paidAmountKobo !== transaction.expected_amount_kobo) {
        markVerificationFailed(transaction, "Paid amount does not match expected amount", paystackData);
        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "amount_mismatch",
          retryable: false,
          expectedAmountKobo: transaction.expected_amount_kobo,
          paidAmountKobo: Number.isFinite(paidAmountKobo) ? paidAmountKobo : null,
        });
        return {
          status: "failed",
          message: "Payment not confirmed",
          retryable: false,
          statusCode: 400,
        };
      }

      const userActivation = activateUserFeatures({
        database,
        transaction,
        createNotification,
      });

      if (!userActivation.success) {
        transaction.status = "failed";
        transaction.processing_locked = true;
        transaction.processed_at = nowIso();
        transaction.updatedAt = new Date();
        transaction.paystack_verify_response = paystackData;
        transaction.activation = {
          user: userActivation,
          connection: null,
        };
        transaction.failure_reason = userActivation.message;

        appendVerificationAudit(database, {
          reference,
          transactionId: transaction.id,
          outcome: "user_activation_failed",
          retryable: Boolean(userActivation.retryable),
          message: userActivation.message,
        });

        return {
          status: "failed",
          message: "Payment not confirmed",
          retryable: Boolean(userActivation.retryable),
          statusCode: userActivation.statusCode || 409,
        };
      }

      let connectionActivation = null;
      if (transaction.connectionId) {
        connectionActivation = activateConnectionAfterPayment({
          database,
          connectionId: transaction.connectionId,
          paymentReference: reference,
          buyerId: transaction.userId,
          amountKobo: paidAmountKobo,
        });

        if (!connectionActivation.success) {
          transaction.status = "failed";
          transaction.processing_locked = true;
          transaction.processed_at = nowIso();
          transaction.updatedAt = new Date();
          transaction.paystack_verify_response = paystackData;
          transaction.activation = {
            user: userActivation,
            connection: connectionActivation,
          };
          transaction.failure_reason = connectionActivation.error || "Connection activation failed";

          appendVerificationAudit(database, {
            reference,
            transactionId: transaction.id,
            outcome: "connection_activation_failed",
            retryable: false,
            message: transaction.failure_reason,
          });

          return {
            status: "failed",
            message: "Payment not confirmed",
            retryable: false,
            statusCode: connectionActivation.statusCode || 409,
          };
        }
      }

      transaction.status = "success";
      transaction.processing_locked = true;
      transaction.processed_at = nowIso();
      transaction.updatedAt = new Date();
      transaction.paystack_verify_response = paystackData;
      transaction.activation = {
        user: userActivation,
        connection: connectionActivation,
      };
      transaction.failure_reason = null;

      appendVerificationAudit(database, {
        reference,
        transactionId: transaction.id,
        outcome: "verified_success",
        retryable: false,
      });

      if (typeof onPaymentActivated === "function") {
        onPaymentActivated({
          reference: transaction.reference,
          transaction,
          activation: transaction.activation,
          verifiedAt: transaction.processed_at,
        });
      }

      return {
        status: "success",
        message: "Payment verified",
        retryable: false,
        payment: {
          reference: transaction.reference,
          status: transaction.status,
          expected_amount_kobo: transaction.expected_amount_kobo,
          paid_amount_kobo: paidAmountKobo,
          currency: paystackCurrency || "NGN",
          paid_at: paystackData.paid_at || null,
          channel: paystackData.channel || null,
        },
        activation: transaction.activation,
        statusCode: 200,
      };
    } catch (error) {
      const retryable = isNetworkOrUpstreamRetryable(error);

      if (transaction.status !== "success") {
        markVerificationFailed(
          transaction,
          error?.response?.data?.message || error.message || "Verification request failed",
          null,
          !retryable
        );
      }

      appendVerificationAudit(database, {
        reference,
        transactionId: transaction.id,
        outcome: "verify_request_error",
        retryable,
        message: error?.response?.data?.message || error?.message || "Verification request failed",
      });

      const statusCode = Number(error?.response?.status) === 404 ? 404 : 502;
      return {
        status: "error",
        message: error?.response?.data?.message || "Failed to verify payment with Paystack",
        retryable,
        statusCode,
      };
    } finally {
      VERIFYING_REFERENCES.delete(reference);
    }
  }

  return {
    initializePayment,
    verifyPayment,
  };
}

module.exports = {
  createPaymentsService,
};
