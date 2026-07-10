// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildAuthMeUserPayload } = require("../backend/routes/authRoutes") as {
  buildAuthMeUserPayload: (
    resolvedUser: Record<string, unknown>,
    userId: string | null,
    email: string | null,
    adminFlags: Record<string, unknown>,
  ) => Record<string, unknown>;
};

describe("buildAuthMeUserPayload", () => {
  it("returns persisted coin fields from the resolved user record", () => {
    const payload = buildAuthMeUserPayload(
      {
        id: "user-1",
        email: "user@example.com",
        daily_streak: 2,
        current_streak: 3,
        streak_count: 4,
        coin_balance: 120,
        coins: 130,
      },
      "user-1",
      "user@example.com",
      { role: "user", is_admin: false },
    );

    expect(payload).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      daily_streak: 2,
      current_streak: 3,
      streak_count: 4,
      coin_balance: 120,
      coins: 130,
    });
  });
});
