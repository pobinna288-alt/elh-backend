import { Injectable } from '@nestjs/common';

@Injectable()
export class AdPersuasiveService {
  /**
   * Create a persuasive ad description optimized for engagement
   */
  async createPersuasiveDescription(
    title: string,
    category: string,
    price: number,
    location: string,
    keyFeatures?: string,
  ): Promise<string> {
    // In production, integrate with AI API (OpenAI, Claude, etc.)
    // This is a template-based implementation
    
    const benefits = this.generateKeyBenefits(category, keyFeatures);
    const cta = this.generateStrongCallToAction();
    const emoji = this.selectEmojis(category);
    
    // Build persuasive description
    let description = `${emoji[0]} ${title} - `;
    description += `${benefits} `;
    description += `Located in ${location} and priced at ${this.formatPrice(price)}. `;
    description += `${cta} ${emoji[1]}`;
    
    // Ensure it doesn't exceed 80 words
    const words = description.split(/\s+/);
    if (words.length > 80) {
      description = words.slice(0, 80).join(' ') + '.';
    }
    
    return description;
  }

  private generateKeyBenefits(category: string, features?: string): string {
    const baseBenefits: Record<string, string> = {
      Electronics: 'Experience cutting-edge technology that enhances your daily productivity and entertainment',
      Clothes: 'Elevate your style with premium quality fabric that looks great and feels amazing',
      Tech: 'Transform your workflow with powerful features designed for professionals like you',
      Health: 'Invest in your wellbeing with proven results that make a real difference',
      Jobs: 'Step into a rewarding career opportunity with competitive benefits and growth potential',
      Services: 'Get expert service you can trust with guaranteed satisfaction and professional results',
      Education: 'Unlock your potential with comprehensive learning that opens new opportunities',
      Sports: 'Achieve your fitness goals faster with equipment trusted by athletes',
      Beauty: 'Reveal your natural radiance with premium products that deliver visible results',
      Automobile: 'Drive with confidence in a reliable vehicle that combines performance and value',
      Food: 'Treat yourself to exceptional taste and quality that satisfies every craving',
      Travel: 'Discover unforgettable destinations with seamless planning and exclusive experiences',
      'Real Estate/Property': 'Secure your dream home in a prime location with excellent investment value',
      'Pet and Animal': 'Welcome a loving companion that brings joy and happiness to your home',
      'Entertainment and Event': 'Create lasting memories with exceptional entertainment that exceeds expectations',
      'Home and Garden': 'Transform your space into a beautiful sanctuary you\'ll love coming home to',
      'Beauty and Personal Care': 'Pamper yourself with luxury products that enhance your natural beauty',
      'Kid and Baby': 'Give your child the best with safe, high-quality products parents trust',
      'Art and Craft': 'Express your creativity with premium materials that inspire masterpieces',
      'Travel and Tourism Service': 'Explore the world hassle-free with expert guidance and exclusive deals',
      'Finance and Insurance': 'Protect what matters most with comprehensive coverage and peace of mind',
      'Book and Stationery': 'Discover knowledge and quality that enriches your learning experience',
      'Music and Instrument': 'Create beautiful music with professional-grade instruments that inspire',
      'Sport Equipment and Outdoor': 'Conquer any adventure with durable gear built for peak performance',
      'Community and Local Service': 'Support local excellence with trusted services that strengthen our community',
    };
    
    let benefit = baseBenefits[category] || 'Experience exceptional quality and value that exceeds your expectations';
    
    if (features) {
      benefit = `${features}. ${benefit}`;
    }
    
    return benefit;
  }

  private generateStrongCallToAction(): string {
    const ctas = [
      'Don\'t miss out - contact us today and make it yours!',
      'Act now before it\'s gone - reach out immediately!',
      'Secure yours today - message us now!',
      'Limited availability - contact us right away!',
      'Take action now - call or message today!',
      'Claim yours before it\'s too late - get in touch now!',
    ];
    
    return ctas[Math.floor(Math.random() * ctas.length)];
  }

  private selectEmojis(category: string): [string, string] {
    const categoryEmojis: Record<string, [string, string]> = {
      Electronics: ['📱', '⚡'],
      Clothes: ['👔', '✨'],
      Tech: ['💻', '🚀'],
      Health: ['💪', '🌟'],
      Jobs: ['💼', '🎯'],
      Services: ['🔧', '👍'],
      Education: ['📚', '🎓'],
      Sports: ['⚽', '🏆'],
      Beauty: ['💄', '✨'],
      Automobile: ['🚗', '⭐'],
      Food: ['🍽️', '😋'],
      Travel: ['✈️', '🌍'],
      'Real Estate/Property': ['🏡', '🔑'],
      'Pet and Animal': ['🐾', '❤️'],
      'Entertainment and Event': ['🎉', '🎊'],
      'Home and Garden': ['🏠', '🌺'],
      'Beauty and Personal Care': ['💅', '✨'],
      'Kid and Baby': ['👶', '💕'],
      'Art and Craft': ['🎨', '✨'],
      'Travel and Tourism Service': ['🗺️', '🌟'],
      'Finance and Insurance': ['💰', '🛡️'],
      'Book and Stationery': ['📖', '✏️'],
      'Music and Instrument': ['🎵', '🎸'],
      'Sport Equipment and Outdoor': ['🏔️', '💪'],
      'Community and Local Service': ['🤝', '⭐'],
    };
    
    return categoryEmojis[category] || ['✨', '🌟'];
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
