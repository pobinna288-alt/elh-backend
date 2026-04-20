const BASE_URL = process.env.OTP_TEST_BASE_URL || `${process.env.BASE_URL || ""}/api/v1/auth`;

const postJson = async (path, body) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json = null;
  try {
    json = await response.json();
  } catch (_error) {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    body: json,
  };
};

const buildPhoneNumber = (seed) => `${`${seed}`.replace(/\D/g, "").slice(-8).padStart(8, "0")}12`;

const requestOtp = async ({ phoneNumber, deviceId }) => {
  const result = await postJson("/request-otp", {
    phoneNumber,
    countryCode: "+234",
    deviceId,
  });

  if (!result.ok || !result.body?.debug_otp) {
    throw new Error(`Failed to request OTP for ${phoneNumber}: ${JSON.stringify(result)}`);
  }

  return result.body.debug_otp;
};

const run = async () => {
  const seed = Date.now();

  const parallelPhone = buildPhoneNumber(seed + 11);
  const spamPhone = buildPhoneNumber(seed + 22);
  const replayPhone = buildPhoneNumber(seed + 33);

  const parallelDevice = `device-parallel-${seed}`;
  const spamDevice = `device-spam-${seed}`;
  const replayDevice = `device-replay-${seed}`;

  const parallelOtp = await requestOtp({ phoneNumber: parallelPhone, deviceId: parallelDevice });
  const parallelResults = await Promise.all(
    Array.from({ length: 20 }, () => postJson("/verify-otp", {
      phoneNumber: parallelPhone,
      countryCode: "+234",
      otp: parallelOtp,
      deviceId: parallelDevice,
    })),
  );

  const parallelSuccesses = parallelResults.filter((entry) => entry.status === 200).length;
  const parallelFailures = parallelResults.filter((entry) => entry.status !== 200).length;

  const replayOtp = await requestOtp({ phoneNumber: replayPhone, deviceId: replayDevice });
  const replayFirst = await postJson("/verify-otp", {
    phoneNumber: replayPhone,
    countryCode: "+234",
    otp: replayOtp,
    deviceId: replayDevice,
  });
  const replaySecond = await postJson("/verify-otp", {
    phoneNumber: replayPhone,
    countryCode: "+234",
    otp: replayOtp,
    deviceId: replayDevice,
  });

  const spamResults = await Promise.all(
    Array.from({ length: 50 }, () => postJson("/request-otp", {
      phoneNumber: spamPhone,
      countryCode: "+234",
      deviceId: spamDevice,
    })),
  );
  const spamAllowed = spamResults.filter((entry) => entry.status === 200).length;
  const spamBlocked = spamResults.filter((entry) => entry.status === 429).length;

  const summary = {
    baseUrl: BASE_URL,
    tests: {
      parallelVerification: {
        successes: parallelSuccesses,
        failures: parallelFailures,
        statuses: parallelResults.map((entry) => entry.status),
        pass: parallelSuccesses === 1 && parallelFailures === 19,
      },
      otpSpamAttack: {
        allowed: spamAllowed,
        blocked429: spamBlocked,
        statusesSample: spamResults.slice(0, 15).map((entry) => entry.status),
        pass: spamBlocked > 0,
      },
      replayAttack: {
        firstStatus: replayFirst.status,
        secondStatus: replaySecond.status,
        secondError: replaySecond.body?.error_code || replaySecond.body?.message || null,
        pass: replayFirst.status === 200 && replaySecond.status >= 400,
      },
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  const allPassed = Object.values(summary.tests).every((entry) => entry.pass === true);
  if (!allPassed) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("OTP security stress test failed:", error);
  process.exitCode = 1;
});
