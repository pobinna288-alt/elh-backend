const { findAdCategory } = require("../config/adCategories");
const { suggestCategory } = require("../services/deepseekCategoryService");

function getUserCategory(body) {
  return body?.category_id ?? body?.categoryId ?? body?.category;
}

function buildMediaMetadata(req) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.map((file) => ({
    originalname: file.originalname,
    mimetype: file.mimetype,
  }));
}

async function aiCategorySuggestion(req, res, next) {
  try {
    const body = req.body || {};

    // If the user already supplied a valid category, keep it and skip AI categorization.
    if (findAdCategory(getUserCategory(body))) {
      return next();
    }

    // Ask DeepSeek to suggest a category based on title, description, and uploaded media.
    const suggested = await suggestCategory({
      title: body.title,
      description: body.description,
      mediaMetadata: buildMediaMetadata(req),
    });

    // Apply the suggestion or fall back to "Others".
    body.category = suggested || "Others";
    req.body = body;
  } catch (error) {
    console.error("[aiCategorySuggestion] Unexpected error:", error?.message || error);

    // Never fail ad creation because of an AI error.
    const body = req.body || {};
    if (!findAdCategory(getUserCategory(body))) {
      body.category = "Others";
      req.body = body;
    }
  }

  // Always proceed to the existing validation middleware, which remains the final authority.
  return next();
}

module.exports = {
  aiCategorySuggestion,
};
