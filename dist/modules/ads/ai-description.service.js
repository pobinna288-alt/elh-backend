"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiDescriptionService = exports.DescriptionPlan = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
var DescriptionPlan;
(function (DescriptionPlan) {
    DescriptionPlan["NORMAL"] = "normal";
    DescriptionPlan["PREMIUM"] = "premium";
    DescriptionPlan["PRO"] = "pro";
    DescriptionPlan["HOT"] = "hot";
})(DescriptionPlan || (exports.DescriptionPlan = DescriptionPlan = {}));
const PLAN_DESCRIPTION_LIMITS = {
    [DescriptionPlan.NORMAL]: {
        maxWords: 50,
        features: ['basic', 'simple'],
        style: 'concise',
    },
    [DescriptionPlan.PREMIUM]: {
        maxWords: 100,
        features: ['detailed', 'persuasive', 'emojis'],
        style: 'engaging',
    },
    [DescriptionPlan.PRO]: {
        maxWords: 150,
        features: ['detailed', 'persuasive', 'emojis', 'keywords', 'call-to-action'],
        style: 'professional',
    },
    [DescriptionPlan.HOT]: {
        maxWords: 200,
        features: ['detailed', 'persuasive', 'emojis', 'keywords', 'call-to-action', 'storytelling'],
        style: 'premium',
    },
};
let AiDescriptionService = class AiDescriptionService {
    constructor(configService) {
        this.configService = configService;
    }
    async generateDescription(title, category, price, location, plan, additionalInfo) {
        const limits = PLAN_DESCRIPTION_LIMITS[plan];
        const prompt = this.buildPrompt(title, category, price, location, additionalInfo, limits);
        const description = this.generateText(prompt, limits);
        const wordCount = description.split(/\s+/).length;
        if (wordCount > limits.maxWords) {
            return description.split(/\s+/).slice(0, limits.maxWords).join(' ') + '...';
        }
        return description;
    }
    buildPrompt(title, category, price, location, additionalInfo, limits) {
        let prompt = `You are an AI assistant that writes ad descriptions.\n\n`;
        prompt += `Task:\nGenerate an ad description for "${title}" in the ${category} category, priced at ${price} in ${location}.`;
        if (additionalInfo) {
            prompt += ` Additional details: ${additionalInfo}.`;
        }
        prompt += `\n\nConstraints:\n`;
        prompt += `- Maximum ${limits.maxWords} words\n`;
        if (limits.features.includes('emojis')) {
            prompt += `- Include relevant emojis\n`;
        }
        if (limits.features.includes('keywords')) {
            prompt += `- Include SEO keywords\n`;
        }
        if (limits.features.includes('call-to-action')) {
            prompt += `- Include a call-to-action\n`;
        }
        if (limits.features.includes('storytelling')) {
            prompt += `- Use storytelling elements\n`;
        }
        if (limits.features.includes('persuasive')) {
            prompt += `- Be persuasive and compelling\n`;
        }
        prompt += `- Style: ${limits.style}\n`;
        prompt += `\nOutput:\n`;
        prompt += `- One single paragraph\n`;
        prompt += `- No explanations\n`;
        prompt += `- No markdown`;
        return prompt;
    }
    generateText(prompt, limits) {
        const templates = {
            normal: (title, category, price, location) => `${title} available in ${location}. Great condition, perfect for your needs. Category: ${category}. Price: ${price}. Contact now for details.`,
            premium: (title, category, price, location) => `🌟 ${title} - Your perfect ${category} solution in ${location}! High quality and reliable, this item offers exceptional value at just ${price}. Don't miss this opportunity to own something special. Perfect condition, ready for immediate pickup or delivery. Contact us today to make it yours! Limited availability - act fast! 🚀`,
            pro: (title, category, price, location) => `✨ Premium ${title} Available Now in ${location}! ✨ Looking for the best ${category} experience? You've found it! This exceptional item combines quality, reliability, and value at an unbeatable price of ${price}. Whether you're a professional or enthusiast, this is the perfect choice. Features include excellent condition, immediate availability, and flexible payment options. Located conveniently in ${location} for easy access. Don't let this opportunity pass you by - contact us now and transform your experience! Act today and enjoy peace of mind with your purchase. 🎯`,
            hot: (title, category, price, location) => `🔥 EXCLUSIVE: ${title} - The Ultimate ${category} Experience in ${location}! 🔥 Imagine owning something that perfectly combines luxury, functionality, and value. This isn't just another listing - it's an opportunity to elevate your lifestyle. At ${price}, you're not just buying a product; you're investing in quality that lasts. Our premium ${title} stands out from the competition with its exceptional features and pristine condition. Located in the heart of ${location}, making it incredibly convenient for you. What makes this special? Everything. From the moment you see it, you'll understand why this is rated as one of the best in its category. Limited quantity available, and at this price point, it won't last long. Join hundreds of satisfied customers who've made the smart choice. Ready to experience the difference? Contact us immediately and secure yours today. Remember: Quality knows no compromise, and neither should you! 💎 Special offer ends soon - Don't miss out! 📞`,
        };
        return templates[limits.style] ?
            templates[limits.style]('Product', 'Electronics', 100, 'City') :
            templates.normal('Product', 'Electronics', 100, 'City');
    }
    validatePlanAccess(userRole, requestedPlan) {
        const planMapping = {
            user: [DescriptionPlan.NORMAL],
            premium: [DescriptionPlan.NORMAL, DescriptionPlan.PREMIUM],
            pro: [
                DescriptionPlan.NORMAL,
                DescriptionPlan.PREMIUM,
                DescriptionPlan.PRO,
            ],
            hot: [
                DescriptionPlan.NORMAL,
                DescriptionPlan.PREMIUM,
                DescriptionPlan.PRO,
                DescriptionPlan.HOT,
            ],
        };
        return planMapping[userRole.toLowerCase()]?.includes(requestedPlan) || false;
    }
};
exports.AiDescriptionService = AiDescriptionService;
exports.AiDescriptionService = AiDescriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiDescriptionService);
//# sourceMappingURL=ai-description.service.js.map