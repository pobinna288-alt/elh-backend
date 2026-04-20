import { Injectable } from '@nestjs/common';

@Injectable()
export class AdWriterService {
  /**
   * Write a clear and appealing ad description
   */
  async writeDescription(
    title: string,
    category: string,
    price: number,
    location: string,
    keyFeatures?: string,
  ): Promise<string> {
    // In production, integrate with AI API (OpenAI, Claude, etc.)
    // This is a template-based implementation
    
    const benefit = this.generateBenefit(category);
    const cta = this.generateCallToAction();
    
    // Build description
    let description = `${title} available in ${location}. `;
    
    if (keyFeatures) {
      description += `${keyFeatures}. `;
    }
    
    description += `${benefit} Priced at ${this.formatPrice(price)}. ${cta}`;
    
    // Ensure it doesn't exceed 50 words
    const words = description.split(/\s+/);
    if (words.length > 50) {
      description = words.slice(0, 50).join(' ') + '.';
    }
    
    return description;
  }

  private generateBenefit(category: string): string {
    const benefits: Record<string, string> = {
      Electronics: 'Perfect for everyday use and reliability',
      Clothes: 'Stylish and comfortable for any occasion',
      Tech: 'Enhanced productivity and performance',
      Health: 'Improve your wellness and lifestyle',
      Jobs: 'Great opportunity for career growth',
      Services: 'Professional and dependable service',
      Education: 'Expand your knowledge and skills',
      Sports: 'Stay active and reach your fitness goals',
      Beauty: 'Look and feel your absolute best',
      Automobile: 'Reliable transportation you can trust',
      Food: 'Delicious and satisfying experience',
      Travel: 'Create unforgettable memories',
      'Real Estate/Property': 'Your ideal living space awaits',
      'Pet and Animal': 'Perfect companion for your family',
      'Entertainment and Event': 'Unforgettable experience guaranteed',
      'Home and Garden': 'Transform your living space',
      'Beauty and Personal Care': 'Enhance your natural beauty',
      'Kid and Baby': 'Safe and perfect for little ones',
      'Art and Craft': 'Express your creativity beautifully',
      'Travel and Tourism Service': 'Explore with confidence and ease',
      'Finance and Insurance': 'Secure your financial future',
      'Book and Stationery': 'Knowledge and quality combined',
      'Music and Instrument': 'Create beautiful music effortlessly',
      'Sport Equipment and Outdoor': 'Adventure and fitness combined',
      'Community and Local Service': 'Supporting your community needs',
    };
    
    return benefits[category] || 'Great value and quality for your needs';
  }

  private generateCallToAction(): string {
    const ctas = [
      'Contact us today to learn more.',
      'Get in touch now for details.',
      'Message us for more information.',
      'Reach out to schedule a viewing.',
      'Call now to secure yours.',
    ];
    
    return ctas[Math.floor(Math.random() * ctas.length)];
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
