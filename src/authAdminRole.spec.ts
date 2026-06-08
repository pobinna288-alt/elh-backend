const { resolveAdminFlags } = require("../backend/utils/adminRole");

describe("resolveAdminFlags", () => {
  it("marks the MVP admin email as admin", () => {
    expect(resolveAdminFlags({ email: "pobinna288@gmail.com" })).toEqual({
      role: "admin",
      is_admin: true,
    });
  });

  it("keeps non-admin users as free users", () => {
    expect(resolveAdminFlags({ email: "guest@example.com", plan: "FREE" })).toEqual({
      role: "user",
      is_admin: false,
    });
  });
});
