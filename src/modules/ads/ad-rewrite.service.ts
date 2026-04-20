import { Injectable } from '@nestjs/common';

@Injectable()
export class AdRewriteService {
  /**
   * Rewrite user's text into a short, clear ad description
   */
  async rewriteDescription(userText: string): Promise<string> {
    // In production, integrate with AI API (OpenAI, Claude, etc.)
    // For now, provide a simplified version
    
    const words = userText.trim().split(/\s+/);
    const cleanText = userText
      .replace(/[!]+/g, '.')
      .replace(/[?]+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Truncate to 25 words if longer
    if (words.length > 25) {
      return words.slice(0, 25).join(' ') + '.';
    }
    
    // Ensure it ends with proper punctuation
    if (!cleanText.endsWith('.')) {
      return cleanText + '.';
    }
    
    return cleanText;
  }

  /**
   * Count words in text
   */
  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
