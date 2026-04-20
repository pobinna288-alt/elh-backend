import { Injectable } from '@nestjs/common';

@Injectable()
export class AdHighConvertingService {
  /**
   * Generate a high-converting ad description designed to drive action
   */
  async generateHighConvertingDescription(
    title: string,
    category: string,
    price: number,
    location: string,
    keyFeatures?: string,
    urgency?: boolean,
  ): Promise<string> {
    // In production, integrate with AI API (OpenAI, Claude, etc.)
    // This is a template-based implementation
    
    const hook = this.generateAttentionHook(category);
    const value = this.highlightValue(category, keyFeatures);
    const urgencyText = urgency ? this.generateUrgency() : '';
    const social = this.addSocialProof();
    const cta = this.generateCompellingCTA();
    const emojis = this.selectStrategicEmojis(category);
    
    // Build high-converting description
    let description = `${emojis[0]} ${hook} ${title} `;
    description += `${value} `;
    
    if (keyFeatures) {
      description += `${keyFeatures}. `;
    }
    
    description += `${social} `;
    description += `Conveniently located in ${location} at an incredible ${this.formatPrice(price)}. `;
    
    if (urgencyText) {
      description += `${urgencyText} `;
    }
    
    description += `${cta} ${emojis[1]}`;
    
    // Ensure it doesn't exceed 120 words
    const words = description.split(/\s+/);
    if (words.length > 120) {
      description = words.slice(0, 120).join(' ') + '!';
    }
    
    return description;
  }

  private generateAttentionHook(category: string): string {
    const hooks: Record<string, string> = {
      Electronics: 'RARE FIND!',
      Clothes: 'EXCLUSIVE STYLE!',
      Tech: 'GAME CHANGER!',
      Health: 'TRANSFORM YOUR LIFE!',
      Jobs: 'CAREER OPPORTUNITY!',
      Services: 'PREMIUM SERVICE!',
      Education: 'UNLOCK YOUR POTENTIAL!',
      Sports: 'CHAMPION\'S CHOICE!',
      Beauty: 'GLOW UP NOW!',
      Automobile: 'DRIVE YOUR DREAM!',
      Food: 'TASTE PERFECTION!',
      Travel: 'ADVENTURE AWAITS!',
      'Real Estate/Property': 'YOUR DREAM HOME!',
      'Pet and Animal': 'PERFECT COMPANION!',
      'Entertainment and Event': 'UNFORGETTABLE EXPERIENCE!',
      'Home and Garden': 'TRANSFORM YOUR SPACE!',
      'Beauty and Personal Care': 'LUXURY MEETS RESULTS!',
      'Kid and Baby': 'PARENT\'S TOP CHOICE!',
      'Art and Craft': 'UNLEASH CREATIVITY!',
      'Travel and Tourism Service': 'EXPLORE PARADISE!',
      'Finance and Insurance': 'SECURE YOUR FUTURE!',
      'Book and Stationery': 'KNOWLEDGE UNLOCKED!',
      'Music and Instrument': 'MAKE MUSIC MAGIC!',
      'Sport Equipment and Outdoor': 'ADVENTURE READY!',
      'Community and Local Service': 'LOCAL EXCELLENCE!',
    };
    
    return hooks[category] || 'EXCEPTIONAL OPPORTUNITY!';
  }

  private highlightValue(category: string, features?: string): string {
    const values: Record<string, string> = {
      Electronics: 'This cutting-edge device delivers unmatched performance and reliability that professionals demand.',
      Clothes: 'Premium quality meets timeless style in this must-have piece that elevates any wardrobe.',
      Tech: 'Industry-leading technology that transforms productivity and delivers results you can measure.',
      Health: 'Proven, science-backed solution that delivers real results people are raving about.',
      Jobs: 'Join a dynamic team with competitive compensation, amazing benefits, and real growth opportunities.',
      Services: 'Expert professionals delivering exceptional results with guaranteed satisfaction every time.',
      Education: 'World-class learning experience that opens doors and creates lasting career advantages.',
      Sports: 'Professional-grade equipment trusted by athletes to achieve peak performance and results.',
      Beauty: 'Luxury formulation with visible results that reveal your most confident, radiant self.',
      Automobile: 'Meticulously maintained vehicle offering exceptional reliability, comfort, and value retention.',
      Food: 'Authentic, mouth-watering experience using only the finest ingredients and time-tested recipes.',
      Travel: 'Curated journey featuring exclusive access, luxury accommodations, and unforgettable moments.',
      'Real Estate/Property': 'Prime location property offering exceptional investment value and lifestyle enhancement.',
      'Pet and Animal': 'Healthy, well-socialized companion that brings endless joy and unconditional love.',
      'Entertainment and Event': 'Premium entertainment experience featuring top-tier talent and unforgettable memories.',
      'Home and Garden': 'Premium quality that transforms your living space into a stunning sanctuary.',
      'Beauty and Personal Care': 'Professional-grade products delivering salon-quality results at home.',
      'Kid and Baby': 'Safety-certified, parent-approved products that provide peace of mind and lasting value.',
      'Art and Craft': 'Premium materials inspiring creativity with professional results every time.',
      'Travel and Tourism Service': 'Hassle-free planning with insider access to exclusive experiences and best prices.',
      'Finance and Insurance': 'Comprehensive protection with flexible terms that adapt to your needs.',
      'Book and Stationery': 'Premium quality materials that enhance learning and professional presentation.',
      'Music and Instrument': 'Professional-quality sound that inspires musicians at every skill level.',
      'Sport Equipment and Outdoor': 'Rugged, weather-tested gear built to withstand any adventure you pursue.',
      'Community and Local Service': 'Trusted local expertise with personalized service that exceeds expectations.',
    };
    
    return values[category] || 'Premium quality offering exceptional value and guaranteed satisfaction.';
  }

  private generateUrgency(): string {
    const urgencies = [
      '⚡ Limited availability - only a few remain at this unbeatable price!',
      '🔥 Act fast! High demand means this won\'t last long!',
      '⏰ Special pricing ends soon - secure yours before it\'s gone!',
      '💎 Rare opportunity! Don\'t let someone else grab this deal!',
      '🎯 Last chance! Inventory moving fast at this exclusive price!',
    ];
    
    return urgencies[Math.floor(Math.random() * urgencies.length)];
  }

  private addSocialProof(): string {
    const proofs = [
      'Highly rated by hundreds of satisfied customers.',
      'Trusted by professionals and enthusiasts alike.',
      'Join countless happy customers who made the smart choice.',
      'Verified quality with proven customer satisfaction.',
      'Award-winning excellence backed by real reviews.',
    ];
    
    return proofs[Math.floor(Math.random() * proofs.length)];
  }

  private generateCompellingCTA(): string {
    const ctas = [
      'Don\'t wait another minute - message us now to claim yours before it\'s too late!',
      'Take action now! Contact us immediately and experience the difference yourself!',
      'Secure yours today! Call or message now for immediate response and exclusive details!',
      'Act now and make it yours! Reach out today - you won\'t regret this decision!',
      'Don\'t miss this opportunity! Contact us right now and transform your experience!',
      'Claim yours before someone else does! Message us today for priority access!',
    ];
    
    return ctas[Math.floor(Math.random() * ctas.length)];
  }

  private selectStrategicEmojis(category: string): [string, string] {
    const emojis: Record<string, [string, string]> = {
      Electronics: ['🚀', '💯'],
      Clothes: ['✨', '👑'],
      Tech: ['💻', '🔥'],
      Health: ['💪', '⭐'],
      Jobs: ['💼', '🌟'],
      Services: ['🏆', '✅'],
      Education: ['🎓', '🚀'],
      Sports: ['🏅', '💪'],
      Beauty: ['💎', '✨'],
      Automobile: ['🚗', '🔥'],
      Food: ['🍽️', '⭐'],
      Travel: ['✈️', '🌴'],
      'Real Estate/Property': ['🏡', '💎'],
      'Pet and Animal': ['🐾', '💕'],
      'Entertainment and Event': ['🎉', '🌟'],
      'Home and Garden': ['🏠', '✨'],
      'Beauty and Personal Care': ['💅', '⭐'],
      'Kid and Baby': ['👶', '💖'],
      'Art and Craft': ['🎨', '🌟'],
      'Travel and Tourism Service': ['🗺️', '✈️'],
      'Finance and Insurance': ['💰', '🛡️'],
      'Book and Stationery': ['📚', '⭐'],
      'Music and Instrument': ['🎸', '🎵'],
      'Sport Equipment and Outdoor': ['🏔️', '🔥'],
      'Community and Local Service': ['🤝', '💯'],
    };
    
    return emojis[category] || ['⭐', '🔥'];
  }

  private formatPrice(price: number): string {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
