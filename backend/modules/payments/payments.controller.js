function resolveStatusCode(error) {
  if (Number.isInteger(error?.statusCode)) {
    return error.statusCode;
  }
  return 500;
}

function resolveRetryable(error, statusCode) {
  if (typeof error?.retryable === "boolean") {
    return error.retryable;
  }
  return statusCode >= 500;
}

const PAYMENT_INITIALIZE_TIMEOUT_MS = 10000;

function isValidInitializeInput(payload) {
  const email = (payload?.email || "").toString().trim().toLowerCase();
  const amount = Number(payload?.amount);
  const userId = (payload?.userId || "").toString().trim();

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const hasUserId = userId.length > 0;

  return hasValidEmail && hasValidAmount && hasUserId;
}

function normalizePaymentResponse(raw = {}) {
  const success = typeof raw.success === "boolean"
    ? raw.success
    : `${raw.status || ""}`.toLowerCase() === "success";
  const message = raw.message || (success ? "Payment request completed" : "Payment request failed");
  const data = raw.data || {
    ...(raw.payment ? { payment: raw.payment } : {}),
    ...(raw.activation ? { activation: raw.activation } : {}),
    ...(raw.reference ? { reference: raw.reference } : {}),
  };

  return {
    ...raw,
    success,
    message,
    data,
  };
}

function createPaymentsController(paymentsService) {
  return {
    initialize: async (req, res) => {
      let responseSent = false;
      const sendOnce = (statusCode, body) => {
        if (responseSent || res.headersSent || res.writableEnded) {
          return undefined;
        }
        responseSent = true;
        return res.status(statusCode).json(body);
      };

      console.log("🔥 Init request received");

      const payload = req.body || {};
      if (!isValidInitializeInput(payload)) {
        return sendOnce(400, {
          success: false,
          message: "Invalid payment input",
        });
      }

      try {
        console.log("🔥 Calling Paystack...");

        const timeoutPromise = new Promise((_, reject) => {
          const timer = setTimeout(() => {
            const timeoutError = new Error("Payment service timeout");
            timeoutError.code = "PAYMENT_TIMEOUT";
            reject(timeoutError);
          }, PAYMENT_INITIALIZE_TIMEOUT_MS);

          timer.unref?.();
        });

        const result = await Promise.race([
          paymentsService.initializePayment(payload),
          timeoutPromise,
        ]);

        console.log("🔥 Paystack responded");

        const authorizationUrl =
          result?.authorization_url ||
          result?.authorizationUrl ||
          result?.data?.authorization_url ||
          result?.data?.authorizationUrl;
        const reference = result?.reference || result?.data?.reference;

        if (!authorizationUrl || !reference) {
          throw new Error("Invalid response from Paystack initialize API");
        }

        return sendOnce(200, {
          success: true,
          message: "Payment initialized successfully",
          data: {
            authorization_url: authorizationUrl,
            reference,
          },
          authorization_url: authorizationUrl,
          reference,
        });
      } catch (error) {
        console.error("❌ Paystack error:", error?.message || "Unknown error");

        if (
          error?.code === "PAYMENT_TIMEOUT" ||
          error?.code === "ECONNABORTED" ||
          error?.code === "ETIMEDOUT"
        ) {
          return sendOnce(504, {
            success: false,
            message: "Payment service timeout",
            retryable: true,
          });
        }

        const statusCode = resolveStatusCode(error);
        if (error?.code === "ACTIVE_SUBSCRIPTION_EXISTS") {
          return sendOnce(409, {
            success: false,
            message: error.message || "You already have an active subscription",
            code: "ACTIVE_SUBSCRIPTION_EXISTS",
            data: error.data || null,
          });
        }

        if (statusCode >= 400 && statusCode < 500) {
          const lowerMessage = `${error?.message || ""}`.toLowerCase();
          const isInputError =
            statusCode === 400 ||
            lowerMessage.includes("email") ||
            lowerMessage.includes("amount") ||
            lowerMessage.includes("userid") ||
            lowerMessage.includes("user not found");

          if (isInputError) {
            return sendOnce(400, {
              success: false,
              message: "Invalid payment input",
            });
          }
        }

        return sendOnce(502, {
          success: false,
          message: "Payment initialization failed",
          retryable: true,
        });
      }
    },

    verify: async (req, res) => {
      try {
        const result = await paymentsService.verifyPayment(req.params.reference);
        const statusCode = Number.isInteger(result?.statusCode) ? result.statusCode : 200;
        return res.status(statusCode).json(normalizePaymentResponse(result));
      } catch (error) {
        console.error("Payment verification error:", error);
        const statusCode = resolveStatusCode(error);
        const body = {
          status: "error",
          message: error?.message || "Failed to verify payment",
          retryable: resolveRetryable(error, statusCode),
          ...(error?.details ? { details: error.details } : {}),
        };
        return res.status(statusCode).json(normalizePaymentResponse(body));
      }
    },
  };
}

module.exports = {
  createPaymentsController,
};
