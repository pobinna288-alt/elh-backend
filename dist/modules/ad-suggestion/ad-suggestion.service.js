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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdSuggestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdSuggestionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const ad_suggestion_log_entity_1 = require("./entities/ad-suggestion-log.entity");
let AdSuggestionService = AdSuggestionService_1 = class AdSuggestionService {
    constructor(logRepository, configService) {
        this.logRepository = logRepository;
        this.configService = configService;
        this.logger = new common_1.Logger(AdSuggestionService_1.name);
    }
    async suggest(title, description, category, targetAudience, userId, userPlan, ipAddress) {
        if (!title && !description) {
            throw new common_1.BadRequestException('At least one of "title" or "description" must be provided');
        }
        let suggestions;
        const openaiKey = this.configService.get('OPENAI_API_KEY');
        if (openaiKey) {
            suggestions = await this.generateWithOpenAI(title, description, category, targetAudience, openaiKey);
        }
        else {
            this.logger.warn('OPENAI_API_KEY not set – using template-based suggestions');
            suggestions = this.generateWithTemplates(title, description, category, targetAudience);
        }
        this.logRequest(userId, userPlan, title, description, category, suggestions.length, ipAddress).catch((err) => this.logger.error('Failed to log ad-suggestion request', err));
        return {
            originalTitle: title ?? null,
            originalDescription: description ?? null,
            suggestions,
            notice: 'These are AI-generated suggestions only. Your original text has not been changed.',
        };
    }
    async generateWithOpenAI(title, description, category, targetAudience, apiKey) {
        try {
            const { default: OpenAI } = await Promise.resolve().then(() => require('openai'));
            const openai = new OpenAI({ apiKey });
            const systemPrompt = `You are an expert marketplace copywriter. 
Your job is to rewrite ad titles and/or descriptions so they are:
- Attention-grabbing and persuasive
- Clear, concise, and professional
- Optimised for high click-through and conversion
- Free of spam or misleading claims

Return EXACTLY 3 alternatives as a JSON array of objects.
Each object must have the keys "suggestedTitle" (string or null) and "suggestedDescription" (string or null).
Only include keys that the user provided input for.
Do NOT include any extra text outside the JSON array.`;
            let userPrompt = '';
            if (title)
                userPrompt += `Original Title: "${title}"\n`;
            if (description)
                userPrompt += `Original Description: "${description}"\n`;
            if (category)
                userPrompt += `Category: ${category}\n`;
            if (targetAudience)
                userPrompt += `Target Audience: ${targetAudience}\n`;
            userPrompt +=
                '\nGenerate 3 improved, high-converting alternatives as a JSON array.';
            const completion = await openai.chat.completions.create({
                model: this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 1024,
            });
            const raw = completion.choices?.[0]?.message?.content?.trim() ?? '[]';
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('OpenAI returned an unexpected format');
            }
            return parsed.slice(0, 3);
        }
        catch (error) {
            this.logger.error('OpenAI call failed, falling back to templates', error);
            return this.generateWithTemplates(title, description, category, targetAudience);
        }
    }
    generateWithTemplates(title, description, category, targetAudience) {
        const suggestions = [];
        const audience = targetAudience || 'buyers';
        const cat = category || 'item';
        const titleVariants = title
            ? [
                `🔥 ${this.capitalize(title)} – Don't Miss Out!`,
                `✅ Premium ${this.capitalize(title)} | Best Deal Today`,
                `⭐ ${this.capitalize(title)} – Trusted Seller, Fast Delivery`,
            ]
            : [];
        const descVariants = description
            ? [
                `Looking for the perfect ${cat}? ${this.capitalize(description)} ` +
                    `This is your chance to get exactly what you need at an unbeatable price. ` +
                    `Loved by ${audience}. Message now – limited availability! 🚀`,
                `${this.capitalize(description)} ` +
                    `Why settle for less? This ${cat} delivers top quality and outstanding value. ` +
                    `Hundreds of satisfied ${audience} can't be wrong. Act fast! ⏰`,
                `${this.capitalize(description)} ` +
                    `Premium quality ${cat} trusted by ${audience}. ` +
                    `Grab it today before it's gone – you won't find a better offer! 💎`,
            ]
            : [];
        for (let i = 0; i < 3; i++) {
            const copy = {};
            if (titleVariants[i])
                copy.suggestedTitle = titleVariants[i];
            if (descVariants[i])
                copy.suggestedDescription = descVariants[i];
            suggestions.push(copy);
        }
        return suggestions;
    }
    async logRequest(userId, userPlan, originalTitle, originalDescription, category, suggestionsReturned, ipAddress) {
        const log = this.logRepository.create({
            userId: userId ?? 'anonymous',
            userPlan: userPlan ?? 'unknown',
            originalTitle: originalTitle ?? null,
            originalDescription: originalDescription ?? null,
            category: category ?? null,
            suggestionsReturned,
            ipAddress: ipAddress ?? null,
        });
        await this.logRepository.save(log);
        this.logger.log(`Ad-suggestion request logged for user=${userId} plan=${userPlan} suggestions=${suggestionsReturned}`);
    }
    capitalize(text) {
        if (!text)
            return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
};
exports.AdSuggestionService = AdSuggestionService;
exports.AdSuggestionService = AdSuggestionService = AdSuggestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ad_suggestion_log_entity_1.AdSuggestionLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], AdSuggestionService);
//# sourceMappingURL=ad-suggestion.service.js.map