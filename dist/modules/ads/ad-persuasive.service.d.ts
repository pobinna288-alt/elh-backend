export declare class AdPersuasiveService {
    createPersuasiveDescription(title: string, category: string, price: number, location: string, keyFeatures?: string): Promise<string>;
    private generateKeyBenefits;
    private generateStrongCallToAction;
    private selectEmojis;
    private formatPrice;
    countWords(text: string): number;
}
