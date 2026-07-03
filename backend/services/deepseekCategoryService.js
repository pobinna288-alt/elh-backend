const axios = require("axios");

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 20000;

const ALLOWED_CATEGORIES = Object.freeze([
  "E-commerce",
  "Finance",
  "Crypto",
  "Education",
  "Health",
  "Real Estate",
  "Technology",
  "Entertainment",
  "Jobs",
  "Services",
  "Others",
]);

function normalizeCategoryName(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function findAllowedCategory(suggestedName) {
  const normalized = normalizeCategoryName(suggestedName);
  if (!normalized) return null;

  return (
    ALLOWED_CATEGORIES.find(
      (category) => category.toLowerCase() === normalized
    ) || null
  );
}

function buildCategoryPrompt({ title, description, mediaMetadata }) {
  const mediaSummary = (mediaMetadata || [])
    .map((meta) => `${meta.originalname || "file"} (${meta.mimetype || "unknown"})`)
    .join(", ");

  const lines = [
    "You are an advertisement categorization assistant.",
    "Classify the following advertisement into exactly ONE category from this list:",
    ALLOWED_CATEGORIES.join(", "),
    "",
    "Rules:",
    "- Return ONLY the category name, with no extra text, explanation, or punctuation.",
    "- If the content does not clearly fit any category, return 'Others'.",
    "- Never invent a category that is not in the list above.",
    "",
  ];

  if (title && String(title).trim()) {
    lines.push(`Title: ${String(title).trim()}`);
  }

  if (description && String(description).trim()) {
    lines.push(`Description: ${String(description).trim()}`);
  }

  if (mediaSummary) {
    lines.push(`Media: ${mediaSummary}`);
  }

  return lines.join("\n");
}

async function suggestCategory({ title, description, mediaMetadata }) {
  const apiKey = String(process.env.DEEPSEEK_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("[DeepSeekCategory] DEEPSEEK_API_KEY is not configured");
    return null;
  }

  const model = String(process.env.DEEPSEEK_MODEL || DEFAULT_MODEL).trim();
  const timeout = Number(process.env.DEEPSEEK_TIMEOUT) || DEFAULT_TIMEOUT_MS;

  const prompt = buildCategoryPrompt({ title, description, mediaMetadata });

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/v1/chat/completions`,
      {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout,
      }
    );

    const rawSuggestion = String(
      response?.data?.choices?.[0]?.message?.content || ""
    ).trim();

    if (!rawSuggestion) {
      return null;
    }

    const matchedCategory = findAllowedCategory(rawSuggestion);

    if (!matchedCategory) {
      console.warn(
        `[DeepSeekCategory] DeepSeek returned an invalid category: "${rawSuggestion}". Falling back to Others.`
      );
      return "Others";
    }

    return matchedCategory;
  } catch (error) {
    console.error(
      "[DeepSeekCategory] Failed to suggest category:",
      error?.message || error
    );
    return null;
  }
}

module.exports = {
  suggestCategory,
  ALLOWED_CATEGORIES,
  findAllowedCategory,
  normalizeCategoryName,
};
