const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = process.env.AUTH_SECURITY_DB_PATH || path.join(process.cwd(), "data", "auth-security.sqlite");
let singletonStore = null;

const toIsoTimestamp = (value = Date.now()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const createAuthSecurityStore = () => {
  const dbPath = path.resolve(DEFAULT_DB_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      userId TEXT PRIMARY KEY,
      normalizedPhone TEXT NOT NULL UNIQUE,
      userJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_otp_requests (
      id TEXT PRIMARY KEY,
      normalizedPhone TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      countryCode TEXT,
      ipAddress TEXT,
      country TEXT,
      otpHash TEXT NOT NULL,
      otpExpiresAt TEXT NOT NULL,
      otpUsed INTEGER NOT NULL DEFAULT 0,
      usedAt TEXT,
      verifiedAt TEXT,
      verifiedIpAddress TEXT,
      invalidatedAt TEXT,
      verificationAttempts INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_users_normalizedPhone ON auth_users(normalizedPhone);
    CREATE INDEX IF NOT EXISTS idx_auth_otp_phone_device_created ON auth_otp_requests(normalizedPhone, deviceId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_otp_phone_created ON auth_otp_requests(normalizedPhone, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_otp_ip_created ON auth_otp_requests(ipAddress, createdAt DESC);
  `);

  const statements = {
    findUserByPhone: db.prepare(`
      SELECT userId, normalizedPhone, userJson, createdAt, updatedAt
      FROM auth_users
      WHERE normalizedPhone = ?
      LIMIT 1
    `),
    listUsers: db.prepare(`
      SELECT userId, normalizedPhone, userJson, createdAt, updatedAt
      FROM auth_users
      ORDER BY createdAt ASC
    `),
    insertUserIfAbsent: db.prepare(`
      INSERT OR IGNORE INTO auth_users (userId, normalizedPhone, userJson, createdAt, updatedAt)
      VALUES (@userId, @normalizedPhone, @userJson, @createdAt, @updatedAt)
    `),
    syncUser: db.prepare(`
      INSERT INTO auth_users (userId, normalizedPhone, userJson, createdAt, updatedAt)
      VALUES (@userId, @normalizedPhone, @userJson, @createdAt, @updatedAt)
      ON CONFLICT(userId) DO UPDATE SET
        normalizedPhone = excluded.normalizedPhone,
        userJson = excluded.userJson,
        updatedAt = excluded.updatedAt
    `),
    countRecentOtpRequests: db.prepare(`
      SELECT COUNT(*) AS total
      FROM auth_otp_requests
      WHERE createdAt >= @cutoff
        AND (
          (@normalizedPhone IS NOT NULL AND normalizedPhone = @normalizedPhone)
          OR (@ipAddress IS NOT NULL AND ipAddress = @ipAddress)
        )
    `),
    countPhoneRequestsSince: db.prepare(`
      SELECT COUNT(*) AS total
      FROM auth_otp_requests
      WHERE createdAt >= @cutoff
        AND normalizedPhone = @normalizedPhone
    `),
    countIpRequestsSince: db.prepare(`
      SELECT COUNT(*) AS total
      FROM auth_otp_requests
      WHERE createdAt >= @cutoff
        AND ipAddress = @ipAddress
    `),
    insertOtpRequest: db.prepare(`
      INSERT INTO auth_otp_requests (
        id,
        normalizedPhone,
        deviceId,
        countryCode,
        ipAddress,
        country,
        otpHash,
        otpExpiresAt,
        otpUsed,
        usedAt,
        verifiedAt,
        verifiedIpAddress,
        invalidatedAt,
        verificationAttempts,
        createdAt
      ) VALUES (
        @id,
        @normalizedPhone,
        @deviceId,
        @countryCode,
        @ipAddress,
        @country,
        @otpHash,
        @otpExpiresAt,
        @otpUsed,
        @usedAt,
        @verifiedAt,
        @verifiedIpAddress,
        @invalidatedAt,
        @verificationAttempts,
        @createdAt
      )
    `),
    invalidatePhoneOtps: db.prepare(`
      UPDATE auth_otp_requests
      SET invalidatedAt = COALESCE(invalidatedAt, @invalidatedAt)
      WHERE normalizedPhone = @normalizedPhone
        AND otpUsed = 0
        AND invalidatedAt IS NULL
    `),
    findOtpById: db.prepare(`
      SELECT *
      FROM auth_otp_requests
      WHERE id = ?
      LIMIT 1
    `),
    findLatestOtpByPhoneDevice: db.prepare(`
      SELECT *
      FROM auth_otp_requests
      WHERE normalizedPhone = ?
        AND deviceId = ?
      ORDER BY datetime(createdAt) DESC
      LIMIT 1
    `),
    incrementOtpAttempts: db.prepare(`
      UPDATE auth_otp_requests
      SET verificationAttempts = verificationAttempts + 1
      WHERE id = ?
        AND otpUsed = 0
        AND invalidatedAt IS NULL
    `),
    markOtpUsed: db.prepare(`
      UPDATE auth_otp_requests
      SET otpUsed = 1,
          usedAt = @usedAt,
          verifiedAt = @verifiedAt,
          verifiedIpAddress = @verifiedIpAddress
      WHERE id = @id
        AND normalizedPhone = @normalizedPhone
        AND deviceId = @deviceId
        AND otpUsed = 0
        AND invalidatedAt IS NULL
        AND otpExpiresAt > @now
    `),
    invalidateOtpSiblings: db.prepare(`
      UPDATE auth_otp_requests
      SET invalidatedAt = COALESCE(invalidatedAt, @invalidatedAt)
      WHERE normalizedPhone = @normalizedPhone
        AND id != @id
        AND otpUsed = 0
        AND invalidatedAt IS NULL
    `),
    invalidateOtpById: db.prepare(`
      UPDATE auth_otp_requests
      SET invalidatedAt = COALESCE(invalidatedAt, @invalidatedAt)
      WHERE id = @id
    `),
    cleanupExpiredOtps: db.prepare(`
      DELETE FROM auth_otp_requests
      WHERE otpExpiresAt < @cutoff
        AND (otpUsed = 1 OR invalidatedAt IS NOT NULL)
    `),
  };

  const toOtpRecord = (row) => {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      phoneNumber: row.normalizedPhone,
      normalizedPhone: row.normalizedPhone,
      deviceId: row.deviceId,
      countryCode: row.countryCode || null,
      ipAddress: row.ipAddress || null,
      country: row.country || null,
      otpHash: row.otpHash,
      otpExpiresAt: row.otpExpiresAt,
      expiresAt: row.otpExpiresAt,
      otpUsed: Boolean(row.otpUsed),
      usedAt: row.usedAt || null,
      verifiedAt: row.verifiedAt || row.usedAt || null,
      verifiedIpAddress: row.verifiedIpAddress || null,
      invalidatedAt: row.invalidatedAt || null,
      verificationAttempts: Number(row.verificationAttempts || 0),
      createdAt: row.createdAt,
    };
  };

  return {
    enabled: true,
    dbPath,
    listUsers() {
      return statements.listUsers.all().map((row) => {
        const user = safeJsonParse(row.userJson, {}) || {};
        return {
          ...user,
          id: user.id || row.userId,
          normalizedPhone: user.normalizedPhone || user.normalized_phone || row.normalizedPhone,
          normalized_phone: user.normalized_phone || user.normalizedPhone || row.normalizedPhone,
          phone_number: user.phone_number || user.phoneNumber || row.normalizedPhone,
          phoneNumber: user.phoneNumber || user.phone_number || row.normalizedPhone,
          phone: user.phone || user.phoneNumber || row.normalizedPhone,
        };
      });
    },
    findUserByNormalizedPhone(normalizedPhone) {
      const row = statements.findUserByPhone.get(normalizedPhone);
      if (!row) {
        return null;
      }

      return {
        userId: row.userId,
        normalizedPhone: row.normalizedPhone,
        user: safeJsonParse(row.userJson, null),
      };
    },
    insertUserIfAbsent(user) {
      const normalizedPhone = user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone;
      if (!user?.id || !normalizedPhone) {
        return { inserted: false, changes: 0 };
      }

      const payload = {
        userId: user.id,
        normalizedPhone,
        userJson: JSON.stringify(user),
        createdAt: toIsoTimestamp(user.createdAt || user.created_at || Date.now()),
        updatedAt: toIsoTimestamp(user.updatedAt || user.updated_at || Date.now()),
      };

      const result = statements.insertUserIfAbsent.run(payload);
      return {
        inserted: result.changes === 1,
        changes: result.changes,
      };
    },
    syncUser(user) {
      const normalizedPhone = user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone;
      if (!user?.id || !normalizedPhone) {
        return { synced: false, changes: 0 };
      }

      const payload = {
        userId: user.id,
        normalizedPhone,
        userJson: JSON.stringify(user),
        createdAt: toIsoTimestamp(user.createdAt || user.created_at || Date.now()),
        updatedAt: toIsoTimestamp(user.updatedAt || user.updated_at || Date.now()),
      };

      const result = statements.syncUser.run(payload);
      return {
        synced: result.changes > 0,
        changes: result.changes,
      };
    },
    countRecentOtpRequests({ normalizedPhone = null, ipAddress = null, minutes = 60 } = {}) {
      const cutoff = toIsoTimestamp(Date.now() - minutes * 60 * 1000);
      const row = statements.countRecentOtpRequests.get({
        cutoff,
        normalizedPhone: normalizedPhone || null,
        ipAddress: ipAddress || null,
      });
      return Number(row?.total || 0);
    },
    createOtpRequest(payload) {
      const createdAt = toIsoTimestamp(payload.createdAt || Date.now());
      const transaction = db.transaction((entry) => {
        statements.invalidatePhoneOtps.run({
          normalizedPhone: entry.normalizedPhone,
          invalidatedAt: createdAt,
        });

        statements.insertOtpRequest.run({
          id: entry.id,
          normalizedPhone: entry.normalizedPhone,
          deviceId: entry.deviceId,
          countryCode: entry.countryCode || null,
          ipAddress: entry.ipAddress || null,
          country: entry.country || null,
          otpHash: entry.otpHash,
          otpExpiresAt: entry.otpExpiresAt,
          otpUsed: entry.otpUsed ? 1 : 0,
          usedAt: entry.usedAt || null,
          verifiedAt: entry.verifiedAt || null,
          verifiedIpAddress: entry.verifiedIpAddress || null,
          invalidatedAt: entry.invalidatedAt || null,
          verificationAttempts: Number(entry.verificationAttempts || 0),
          createdAt,
        });
      });

      transaction({
        ...payload,
        createdAt,
      });

      return this.getOtpRequestById(payload.id);
    },
    reserveOtpRequest({ otpRecord, phoneLimit = 5, ipLimit = 5, windowMinutes = 10 }) {
      const createdAt = toIsoTimestamp(otpRecord?.createdAt || Date.now());
      const transaction = db.transaction((entry) => {
        const cutoff = toIsoTimestamp(Date.now() - windowMinutes * 60 * 1000);
        const phoneCount = entry.normalizedPhone
          ? Number(statements.countPhoneRequestsSince.get({ cutoff, normalizedPhone: entry.normalizedPhone })?.total || 0)
          : 0;
        const ipCount = entry.ipAddress
          ? Number(statements.countIpRequestsSince.get({ cutoff, ipAddress: entry.ipAddress })?.total || 0)
          : 0;

        if (entry.normalizedPhone && phoneCount >= phoneLimit) {
          return {
            allowed: false,
            reason: "phone",
            phoneCount,
            ipCount,
          };
        }

        if (entry.ipAddress && ipCount >= ipLimit) {
          return {
            allowed: false,
            reason: "ip",
            phoneCount,
            ipCount,
          };
        }

        statements.invalidatePhoneOtps.run({
          normalizedPhone: entry.normalizedPhone,
          invalidatedAt: createdAt,
        });

        statements.insertOtpRequest.run({
          id: entry.id,
          normalizedPhone: entry.normalizedPhone,
          deviceId: entry.deviceId,
          countryCode: entry.countryCode || null,
          ipAddress: entry.ipAddress || null,
          country: entry.country || null,
          otpHash: entry.otpHash,
          otpExpiresAt: entry.otpExpiresAt,
          otpUsed: entry.otpUsed ? 1 : 0,
          usedAt: entry.usedAt || null,
          verifiedAt: entry.verifiedAt || null,
          verifiedIpAddress: entry.verifiedIpAddress || null,
          invalidatedAt: entry.invalidatedAt || null,
          verificationAttempts: Number(entry.verificationAttempts || 0),
          createdAt,
        });

        return {
          allowed: true,
          reason: null,
          phoneCount: phoneCount + 1,
          ipCount: entry.ipAddress ? ipCount + 1 : ipCount,
        };
      });

      return transaction({
        ...otpRecord,
        createdAt,
      });
    },
    getOtpRequestById(id) {
      return toOtpRecord(statements.findOtpById.get(id));
    },
    getLatestOtpRequest({ normalizedPhone, deviceId }) {
      if (!normalizedPhone || !deviceId) {
        return null;
      }
      return toOtpRecord(statements.findLatestOtpByPhoneDevice.get(normalizedPhone, deviceId));
    },
    incrementOtpAttempts({ otpRecordId }) {
      statements.incrementOtpAttempts.run(otpRecordId);
      return this.getOtpRequestById(otpRecordId);
    },
    markOtpUsed({ otpRecordId, normalizedPhone, deviceId, ipAddress }) {
      const now = toIsoTimestamp(Date.now());
      const result = statements.markOtpUsed.run({
        usedAt: now,
        verifiedAt: now,
        verifiedIpAddress: ipAddress || null,
        id: otpRecordId,
        normalizedPhone,
        deviceId,
        now,
      });

      if (result.changes === 1) {
        statements.invalidateOtpSiblings.run({
          invalidatedAt: now,
          normalizedPhone,
          id: otpRecordId,
        });
      }

      return {
        updated: result.changes === 1,
        changes: result.changes,
        usedAt: now,
      };
    },
    invalidateOtp(otpRecordId, invalidatedAt = toIsoTimestamp(Date.now())) {
      const result = statements.invalidateOtpById.run({
        id: otpRecordId,
        invalidatedAt,
      });

      return {
        invalidated: result.changes > 0,
        changes: result.changes,
      };
    },
    cleanupOtpData() {
      const cutoff = toIsoTimestamp(Date.now() - 24 * 60 * 60 * 1000);
      statements.cleanupExpiredOtps.run({ cutoff });
    },
  };
};

const getAuthSecurityStore = () => {
  if (!singletonStore) {
    singletonStore = createAuthSecurityStore();
  }

  return singletonStore;
};

module.exports = {
  getAuthSecurityStore,
};
