import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum DescriptionPlan {
  NORMAL = 'normal',
  PREMIUM = 'premium',
  PRO = 'pro',
  HOT = 'hot',
}

interface PlanLimits {
  maxWords: number;
  features: string[];
  style: string;
}

const PLAN_DESCRIPTION_LIMITS: Record<DescriptionPlan, PlanLimits> = {
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

@Injectable()
export class AiDescriptionService {
  constructor(private configService: ConfigService) {}

  async generateDescription(
    title: string,
    category: string,
    price: number,
    location: string,
    plan: DescriptionPlan,
    additionalInfo?: string,
  ): Promise<string> {
    const limits = PLAN_DESCRIPTION_LIMITS[plan];

    // Build the prompt based on plan
    const prompt = this.buildPrompt(
      title,
      category,
      price,
      location,
      additionalInfo,
      limits,
    );

    // Generate description (simulated for now)
    const description = this.generateText(prompt, limits);

    // Validate word count
    const wordCount = description.split(/\s+/).length;
    if (wordCount > limits.maxWords) {
      return description.split(/\s+/).slice(0, limits.maxWords).join(' ') + '...';
    }

    return description;
  }

  private buildPrompt(
    title: string,
    category: string,
    price: number,
    location: string,
    additionalInfo: string | undefined,
    limits: PlanLimits,
  ): string {
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

  private generateText(prompt: string, limits: PlanLimits): string {
    // This is a simplified implementation
    // In production, integrate with OpenAI, Claude, or another LLM API
    
    // For now, return template-based descriptions based on plan
    const templates = {
      normal: (title: string, category: string, price: number, location: string) =>
        `${title} available in ${location}. Great condition, perfect for your needs. Category: ${category}. Price: ${price}. Contact now for details.`,
      
      premium: (title: string, category: string, price: number, location: string) =>
        `🌟 ${title} - Your perfect ${category} solution in ${location}! High quality and reliable, this item offers exceptional value at just ${price}. Don't miss this opportunity to own something special. Perfect condition, ready for immediate pickup or delivery. Contact us today to make it yours! Limited availability - act fast! 🚀`,
      
      pro: (title: string, category: string, price: number, location: string) =>
        `✨ Premium ${title} Available Now in ${location}! ✨ Looking for the best ${category} experience? You've found it! This exceptional item combines quality, reliability, and value at an unbeatable price of ${price}. Whether you're a professional or enthusiast, this is the perfect choice. Features include excellent condition, immediate availability, and flexible payment options. Located conveniently in ${location} for easy access. Don't let this opportunity pass you by - contact us now and transform your experience! Act today and enjoy peace of mind with your purchase. 🎯`,
      
      hot: (title: string, category: string, price: number, location: string) =>
        `🔥 EXCLUSIVE: ${title} - The Ultimate ${category} Experience in ${location}! 🔥 Imagine owning something that perfectly combines luxury, functionality, and value. This isn't just another listing - it's an opportunity to elevate your lifestyle. At ${price}, you're not just buying a product; you're investing in quality that lasts. Our premium ${title} stands out from the competition with its exceptional features and pristine condition. Located in the heart of ${location}, making it incredibly convenient for you. What makes this special? Everything. From the moment you see it, you'll understand why this is rated as one of the best in its category. Limited quantity available, and at this price point, it won't last long. Join hundreds of satisfied customers who've made the smart choice. Ready to experience the difference? Contact us immediately and secure yours today. Remember: Quality knows no compromise, and neither should you! 💎 Special offer ends soon - Don't miss out! 📞`,
    };

    // Return template based on plan (in production, call actual AI API)
    return templates[limits.style] ? 
      templates[limits.style]('Product', 'Electronics', 100, 'City') :
      templates.normal('Product', 'Electronics', 100, 'City');
  }

  validatePlanAccess(userRole: string, requestedPlan: DescriptionPlan): boolean {
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
}
