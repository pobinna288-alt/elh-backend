function createAuthController(authService) {
  return {
    signup: async (req, res) => {
      try {
        const result = await authService.signupLegacyUser(req.body || {});
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
          success: false,
          error: "Registration failed",
        });
      }
    },

    login: async (req, res) => {
      try {
        const result = await authService.loginLegacyUser(req.body || {});
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
          success: false,
          error: "Login failed",
        });
      }
    },

    logout: (req, res) => {
      try {
        const result = authService.logoutLegacyUser({
          userId: req.user.id,
          token: req.token,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to logout",
        });
      }
    },
  };
}

module.exports = {
  createAuthController,
};
