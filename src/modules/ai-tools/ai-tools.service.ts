import { Injectable } from '@nestjs/common';
import {
  SmartCopywriterDto,
  NegotiationAiDto,
  CompetitorAnalyzerDto,
  AudienceExpansionDto,
  AdImproverDto,
  MarketSuggestionDto,
} from './dto/ai-tools.dto';

@Injectable()
export class AiToolsService {
  // Smart Copywriter: Generate compelling ad copy
  async smartCopywriter(dto: SmartCopywriterDto) {
    // In production, this would integrate with OpenAI or similar
    const templates = {
      professional: [
        `Discover premium ${dto.productName} - ${dto.category} excellence at its finest.`,
        `Transform your experience with our high-quality ${dto.productName}.`,
        `Industry-leading ${dto.productName} designed for ${dto.targetAudience || 'professionals'}.`,
      ],
      casual: [
        `Check out this awesome ${dto.productName}! Perfect for ${dto.targetAudience || 'anyone'}.`,
        `You'll love this ${dto.productName}! Great ${dto.category} at an amazing price.`,
        `Don't miss out on this ${dto.productName} - your new favorite ${dto.category}!`,
      ],
      urgent: [
        `🔥 LIMITED TIME: Premium ${dto.productName} available now!`,
        `⏰ Act fast! This ${dto.productName} won't last long.`,
        `🚀 Exclusive offer on ${dto.productName} - grab it before it's gone!`,
      ],
    };

    const tone = dto.tone || 'professional';
    const suggestions = templates[tone] || templates.professional;

    return {
      suggestions: suggestions.map((text, index) => ({
        id: index + 1,
        text,
        tone,
        estimatedEngagement: Math.floor(Math.random() * 30) + 70, // 70-100%
      })),
      keywords: this.generateKeywords(dto),
      seoScore: Math.floor(Math.random() * 20) + 80, // 80-100
    };
  }

  // Negotiation AI: Suggest counter-offers
  async negotiationAi(dto: NegotiationAiDto) {
    const difference = dto.originalPrice - dto.offeredPrice;
    const percentOff = (difference / dto.originalPrice) * 100;

    let strategy = '';
    let counterOffer = 0;
    let reasoning = '';

    if (percentOff > 30) {
      strategy = 'firm_decline';
      counterOffer = dto.originalPrice * 0.85;
      reasoning = 'Offer too low. Counter with 15% discount to maintain value.';
    } else if (percentOff > 15) {
      strategy = 'negotiate';
      counterOffer = dto.originalPrice * 0.90;
      reasoning = 'Reasonable offer. Counter with 10% discount to secure deal.';
    } else {
      strategy = 'accept';
      counterOffer = dto.offeredPrice;
      reasoning = 'Good offer. Consider accepting to close quickly.';
    }

    return {
      strategy,
      counterOffer: Math.round(counterOffer * 100) / 100,
      reasoning,
      marketInsight: `Similar ${dto.productCategory} items typically sell at ${Math.round(dto.originalPrice * 0.92)} avg.`,
      responseTemplates: this.getNegotiationTemplates(strategy),
    };
  }

  // Competitor Analyzer: Compare with similar ads
  async competitorAnalyzer(dto: CompetitorAnalyzerDto) {
    // Simulate competitor data
    const competitorCount = Math.floor(Math.random() * 20) + 10;
    const avgPrice = dto.yourPrice * (0.9 + Math.random() * 0.2);

    return {
      category: dto.category,
      yourPrice: dto.yourPrice,
      competitorData: {
        totalCompetitors: competitorCount,
        averagePrice: Math.round(avgPrice * 100) / 100,
        lowestPrice: Math.round(avgPrice * 0.8 * 100) / 100,
        highestPrice: Math.round(avgPrice * 1.3 * 100) / 100,
      },
      positioning: dto.yourPrice < avgPrice ? 'competitive' : 'premium',
      recommendations: [
        dto.yourPrice > avgPrice ? 'Consider lowering price by 5-10% to increase visibility' : 'Your price is competitive!',
        'Add high-quality images to stand out',
        'Update ad description with trending keywords',
        'Consider boosting ad during peak hours (6-9 PM)',
      ],
      trendsInsight: `${dto.category} ads see 40% more engagement on weekends`,
    };
  }

  // Audience Expansion: Suggest new markets
  async audienceExpansion(dto: AudienceExpansionDto) {
    const relatedCategories = this.getRelatedCategories(dto.currentCategory);
    const suggestedLocations = this.getSuggestedLocations(dto.currentLocations);

    return {
      currentReach: {
        category: dto.currentCategory,
        locations: dto.currentLocations,
        estimatedAudience: Math.floor(Math.random() * 5000) + 5000,
      },
      expansionOpportunities: {
        categories: relatedCategories,
        locations: suggestedLocations,
        potentialAudience: Math.floor(Math.random() * 10000) + 10000,
      },
      recommendations: [
        `Expand to ${relatedCategories[0]} for 30% more reach`,
        `Target ${suggestedLocations[0]} - growing market with high demand`,
        'Create regional-specific ad variations',
        'Test different price points in new markets',
      ],
    };
  }

    // Ad Improver: Improve existing ad text
    async adImprover(dto: AdImproverDto) {
      const improvements: string[] = [];

      if (!/call to action/gi.test(dto.currentText)) {
        improvements.push('Add a clear call-to-action to tell buyers what to do next.');
      }

      if (dto.currentText.length < 120) {
        improvements.push('Expand the description with 1–2 more benefit-focused sentences.');
      }

      if (!/[0-9]{1,3}%/g.test(dto.currentText)) {
        improvements.push('Consider highlighting a numeric benefit (e.g., "save 20%" or "2x faster").');
      }

      const improvedVersion = `${dto.currentText.trim()} ${
        improvements.length
          ? ' ' + improvements[0].replace(/\.$/, '') + '.'
          : ''
      }`.trim();

      return {
        improvedText: improvedVersion,
        suggestions: improvements,
      };
    }

    // Market Suggestion AI: Suggest categories and markets to target
    async marketSuggestion(dto: MarketSuggestionDto) {
      const suggestedCategories = this.getRelatedCategories(dto.category || 'default');
      const suggestedLocations = this.getSuggestedLocations(dto.currentLocations || []);

      return {
        product: dto.productName,
        baseCategory: dto.category,
        suggestedCategories,
        suggestedLocations,
        insights: [
          'Focus on markets with high search volume but fewer competing ads.',
          'Localize your ad copy for top suggested locations to improve relevance.',
        ],
      };
    }

  // Helper methods
  private generateKeywords(dto: SmartCopywriterDto): string[] {
    return [
      dto.productName.toLowerCase(),
      dto.category.toLowerCase(),
      'quality',
      'affordable',
      'best deal',
      dto.targetAudience?.toLowerCase() || 'everyone',
    ].filter(Boolean);
  }

  private getNegotiationTemplates(strategy: string): string[] {
    const templates = {
      firm_decline: [
        'Thank you for your interest. My price reflects the quality and value. I can offer 15% off: $[counterOffer].',
        'I appreciate your offer, but I believe the item is worth more. How about $[counterOffer]?',
      ],
      negotiate: [
        'Thanks for your offer! I can meet you halfway at $[counterOffer].',
        'Great interest! I can do $[counterOffer] - that\'s my best price.',
      ],
      accept: [
        'Deal! Let\'s proceed with $[counterOffer].',
        'Perfect! I accept your offer. When can we arrange the exchange?',
      ],
    };

    return templates[strategy] || templates.negotiate;
  }

  private getRelatedCategories(category: string): string[] {
    const related = {
      'Tech': ['Electronics', 'Gadgets', 'Smart Home'],
      'Clothes': ['Fashion', 'Accessories', 'Shoes'],
      'Health': ['Fitness', 'Wellness', 'Beauty'],
      'default': ['General', 'Miscellaneous', 'Other'],
    };

    return related[category] || related.default;
  }

  private getSuggestedLocations(current: string[]): string[] {
    const suggestions = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    return suggestions.filter(loc => !current.includes(loc)).slice(0, 3);
  }
}
