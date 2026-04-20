import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdSuggestionLog } from './entities/ad-suggestion-log.entity';

interface SuggestedCopy {
  suggestedTitle?: string;
  suggestedDescription?: string;
}

interface SuggestionResult {
  originalTitle: string | null;
  originalDescription: string | null;
  suggestions: SuggestedCopy[];
  notice: string;
}

@Injectable()
export class AdSuggestionService {
  private readonly logger = new Logger(AdSuggestionService.name);

  constructor(
    @InjectRepository(AdSuggestionLog)
    private readonly logRepository: Repository<AdSuggestionLog>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate attractive, persuasive, high-converting ad copy suggestions.
   * Returns suggestions WITHOUT overwriting user input.
   */
  async suggest(
    title: string | undefined,
    description: string | undefined,
    category?: string,
    targetAudience?: string,
    userId?: string,
    userPlan?: string,
    ipAddress?: string,
  ): Promise<SuggestionResult> {
    if (!title && !description) {
      throw new BadRequestException(
        'At least one of "title" or "description" must be provided',
      );
    }

    // ── Try OpenAI first, fall back to template engine ──────────
    let suggestions: SuggestedCopy[];

    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (openaiKey) {
      suggestions = await this.generateWithOpenAI(
        title,
        description,
        category,
        targetAudience,
        openaiKey,
      );
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set – using template-based suggestions',
      );
      suggestions = this.generateWithTemplates(
        title,
        description,
        category,
        targetAudience,
      );
    }

    // ── Analytics log (fire-and-forget) ─────────────────────────
    this.logRequest(
      userId,
      userPlan,
      title,
      description,
      category,
      suggestions.length,
      ipAddress,
    ).catch((err) =>
      this.logger.error('Failed to log ad-suggestion request', err),
    );

    return {
      originalTitle: title ?? null,
      originalDescription: description ?? null,
      suggestions,
      notice:
        'These are AI-generated suggestions only. Your original text has not been changed.',
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  OpenAI Integration
  // ════════════════════════════════════════════════════════════════

  private async generateWithOpenAI(
    title: string | undefined,
    description: string | undefined,
    category: string | undefined,
    targetAudience: string | undefined,
    apiKey: string,
  ): Promise<SuggestedCopy[]> {
    try {
      // Dynamic import so the module still loads if openai is not installed
      const { default: OpenAI } = await import('openai');
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
      if (title) userPrompt += `Original Title: "${title}"\n`;
      if (description) userPrompt += `Original Description: "${description}"\n`;
      if (category) userPrompt += `Category: ${category}\n`;
      if (targetAudience) userPrompt += `Target Audience: ${targetAudience}\n`;

      userPrompt +=
        '\nGenerate 3 improved, high-converting alternatives as a JSON array.';

      const completion = await openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1024,
      });

      const raw = completion.choices?.[0]?.message?.content?.trim() ?? '[]';

      // Strip potential markdown fences
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const parsed: SuggestedCopy[] = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('OpenAI returned an unexpected format');
      }

      return parsed.slice(0, 3);
    } catch (error) {
      this.logger.error('OpenAI call failed, falling back to templates', error);
      return this.generateWithTemplates(title, description, category, targetAudience);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  Template-Based Fallback
  // ════════════════════════════════════════════════════════════════

  private generateWithTemplates(
    title: string | undefined,
    description: string | undefined,
    category: string | undefined,
    targetAudience: string | undefined,
  ): SuggestedCopy[] {
    const suggestions: SuggestedCopy[] = [];

    const audience = targetAudience || 'buyers';
    const cat = category || 'item';

    // ── Title suggestions ──
    const titleVariants: string[] = title
      ? [
          `🔥 ${this.capitalize(title)} – Don't Miss Out!`,
          `✅ Premium ${this.capitalize(title)} | Best Deal Today`,
          `⭐ ${this.capitalize(title)} – Trusted Seller, Fast Delivery`,
        ]
      : [];

    // ── Description suggestions ──
    const descVariants: string[] = description
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

    // Combine into 3 suggestion objects
    for (let i = 0; i < 3; i++) {
      const copy: SuggestedCopy = {};
      if (titleVariants[i]) copy.suggestedTitle = titleVariants[i];
      if (descVariants[i]) copy.suggestedDescription = descVariants[i];
      suggestions.push(copy);
    }

    return suggestions;
  }

  // ════════════════════════════════════════════════════════════════
  //  Analytics Logging
  // ════════════════════════════════════════════════════════════════

  private async logRequest(
    userId: string | undefined,
    userPlan: string | undefined,
    originalTitle: string | undefined,
    originalDescription: string | undefined,
    category: string | undefined,
    suggestionsReturned: number,
    ipAddress: string | undefined,
  ): Promise<void> {
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
    this.logger.log(
      `Ad-suggestion request logged for user=${userId} plan=${userPlan} suggestions=${suggestionsReturned}`,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────

  private capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
