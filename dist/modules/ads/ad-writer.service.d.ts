export declare class AdWriterService {
    writeDescription(title: string, category: string, price: number, location: string, keyFeatures?: string): Promise<string>;
    private generateBenefit;
    private generateCallToAction;
    private formatPrice;
    countWords(text: string): number;
}
