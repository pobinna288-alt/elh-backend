const express = require("express");
const router = express.Router();
const axios = require("axios");

// Import your database models (adjust paths/names to your project)
const { User, Subscription, AiUsage } = require("../models");

const PLAN_TOOL_LIMITS = {
  premium: {
    copywriter: 10,
    negotiation: 10,
    competitor: 10,
  },
  pro: {
    copywriter: 25,
    negotiation: 25,
    competitor: 25,
  },
  hot: {
    copywriter: 30,
    negotiation: 30,
    competitor: 30,
  },
  enterprise: {
    copywriter: 30,
    negotiation: 30,
    competitor: 30,
  },
};

const PLAN_RULES = {
  premium: {
    maxVideoDurationSeconds: 180,
    maxAdReach: 10000,
    coinsPerVideo: 2,
  },
  pro: {
    maxVideoDurationSeconds: 300,
    maxAdReach: 500000,
    coinsPerVideo: 3,
  },
  hot: {
    maxVideoDurationSeconds: 420,
    maxAdReach: 1000000,
    coinsPerVideo: 5,
  },
  enterprise: {
    maxVideoDurationSeconds: 600,
    maxAdReach: 1000000,
    coinsPerVideo: 5,
  },
};

// Helper: date key
function getToday() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

// Helper: increment AI usage (per user, tool, day)
async function incrementUsage(userId, tool) {
  const today = getToday();
  let usage = await AiUsage.findOne({
    user_id: userId,
    tool_name: tool,
    usage_date: today,
  });

  if (usage) {
    usage.usage_count += 1;
    await usage.save();
  } else {
    await AiUsage.create({
      user_id: userId,
      tool_name: tool,
      usage_count: 1,
      usage_date: today,
    });
  }
}

// Build tool-specific prompt (JSON-output as required)
function buildPrompt(tool, data) {
  switch (tool) {
    case "copywriter":
      return `You are an expert advertising copywriter.
Generate high-converting ad copy for:
Product/Service: ${data.product}
Target Audience: ${data.audience}
Brand Tone: ${data.tone}
Global relevance required.
Return JSON:
{
  "generated_ad_copy": "..."
}`;

    case "negotiation":
      return `You are a professional sales negotiation AI.
Help respond to this buyer inquiry:
"${data.buyer_message}"
Provide a persuasive, respectful reply.
Return JSON:
{
  "generated_reply": "..."
}`;

    case "competitor":
      return `You are a market analyst AI.
Analyze competitors for:
Product/Service: ${data.product}
Target Market/Country: ${data.target_country}
Provide:
- Top competitors
- Strengths and weaknesses
- Opportunities
- Strategic advice to outperform them
Return JSON:
{
  "competitor_analysis": {
    "top_competitors": ["...", "..."],
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "opportunities": ["...", "..."],
    "strategic_advice": "..."
  }
}`;

    default:
      throw new Error("Invalid AI tool selected");
  }
}

// Pro Business AI endpoint
// Expect body:
// {
//   user_id: "...",
//   tool: "copywriter|negotiation|competitor",
//   prompt_data: {...},
//   video_duration_sec?: number,
//   coins_used_for_video?: number,
//   ad_reach_requested?: number
// }
router.post("/pro-business/ai", async (req, res) => {
  try {
    const {
      user_id,
      tool,
      prompt_data = {},
      video_duration_sec,
      coins_used_for_video,
      ad_reach_requested,
    } = req.body;

    // Validate tool
    if (!['copywriter', 'negotiation', 'competitor'].includes(tool)) {
      return res.status(400).json({ error: "Invalid AI tool selected" });
    }

    // 1️⃣ Verify paid subscription (Starter/Pro/Elite/Enterprise)
    const user = await User.findById(user_id);
    const subscription = await Subscription.findOne({
      user_id,
      status: { $in: ["active", "paid"] },
    });

    const now = new Date();

    // Ensure subscription exists and is active
    const isActive = subscription &&
      (subscription.status === "active" || subscription.status === "paid");

    const notExpired = subscription && subscription.expires_at
      ? new Date(subscription.expires_at) > now
      : !subscription || !subscription.expires_at
        ? false
        : false;

    if (!user || !subscription || !isActive || !notExpired) {
      return res.status(403).json({
        error: "Active Starter, Pro, or Elite subscription required",
      });
    }

    const subscriptionPlan = String(subscription.plan || user.plan || "premium").toLowerCase();
    const normalizedPlan = subscriptionPlan === "starter" ? "premium" : subscriptionPlan === "elite" ? "hot" : subscriptionPlan;
    const planLimits = PLAN_TOOL_LIMITS[normalizedPlan];
    const planRules = PLAN_RULES[normalizedPlan];

    if (!planLimits || !planRules) {
      return res.status(403).json({
        error: "Unsupported subscription plan",
      });
    }

    // 2️⃣ Enforce video & plan limits (if values provided)
    if (typeof video_duration_sec === "number" && video_duration_sec > planRules.maxVideoDurationSeconds) {
      if (normalizedPlan === "hot") {
        return res.status(400).json({
          success: false,
          message: "Elite tier videos cannot exceed 7 minutes",
        });
      }
      return res.status(400).json({
        error: `Video duration exceeds ${planRules.maxVideoDurationSeconds} seconds limit for ${normalizedPlan} plan`,
      });
    }

    // COINS PER VIDEO limit by plan
    const coinsUsed =
      typeof coins_used_for_video === "number" ? coins_used_for_video : 0;

    if (coinsUsed > planRules.coinsPerVideo) {
      return res.status(400).json({
        error: `Coins per video limit exceeded (max ${planRules.coinsPerVideo} for ${normalizedPlan} plan)`,
      });
    }

    // AD REACH limit by plan
    const requestedReach =
      typeof ad_reach_requested === "number" ? ad_reach_requested : 0;

    if (requestedReach > planRules.maxAdReach) {
      return res.status(400).json({
        error: `Ad reach limit exceeded (max ${planRules.maxAdReach} views per video)`,
      });
    }

    // 3️⃣ Check tool daily limit by plan
    const today = getToday();
    const dailyUsageDocs = await AiUsage.find({ user_id, usage_date: today });
    const toolUsage = dailyUsageDocs.find((u) => u.tool_name === tool);
    const todayToolUsage = toolUsage ? toolUsage.usage_count : 0;
    const toolLimit = planLimits[tool];

    if (todayToolUsage >= toolLimit) {
      return res.status(429).json({
        error: "Daily AI limit reached",
        message: `Daily ${tool} limit reached for ${normalizedPlan} plan`,
      });
    }

    // 6️⃣ Build tool-specific prompt (backend-only)
    const prompt = buildPrompt(tool, prompt_data);

    const deepseekApiKey = String(process.env.DEEPSEEK_API_KEY || "").trim();
    if (!deepseekApiKey) {
      return res.status(500).json({ error: "AI provider key missing" });
    }

    const deepseekTimeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 20000;
    const aiResponse = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: deepseekTimeoutMs,
      }
    );

    const rawContent = aiResponse?.data?.choices?.[0]?.message?.content || "";

    // 8️⃣ Parse JSON safely before returning
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { raw: rawContent };
    }

    // 4️⃣ Increment AI usage (server-side only)
    await incrementUsage(user_id, tool);

    const remainingDailyUsage = Math.max(toolLimit - (todayToolUsage + 1), 0);

    // Compute remaining ad reach within Pro plan cap
    const adReachRemaining = Math.max(planRules.maxAdReach - requestedReach, 0);

    // 🔟 Return unified backend response JSON (frontend contract)
    return res.json({
      tool,
      result: parsed,
      remaining_daily_usage: remainingDailyUsage,
      coins_used: coinsUsed,
      ad_reach_remaining: adReachRemaining,
      video_duration_limit: `${Math.floor(planRules.maxVideoDurationSeconds / 60)} minutes`,
      subscription_status: "active",
      plan: normalizedPlan,
    });
  } catch (error) {
    console.error("Pro Business AI error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong with AI request" });
  }
});

module.exports = router;
