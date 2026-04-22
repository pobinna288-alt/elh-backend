"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdWriterService = void 0;
const common_1 = require("@nestjs/common");
let AdWriterService = class AdWriterService {
    async writeDescription(title, category, price, location, keyFeatures) {
        const benefit = this.generateBenefit(category);
        const cta = this.generateCallToAction();
        let description = `${title} available in ${location}. `;
        if (keyFeatures) {
            description += `${keyFeatures}. `;
        }
        description += `${benefit} Priced at ${this.formatPrice(price)}. ${cta}`;
        const words = description.split(/\s+/);
        if (words.length > 50) {
            description = words.slice(0, 50).join(' ') + '.';
        }
        return description;
    }
    generateBenefit(category) {
        const benefits = {
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
    generateCallToAction() {
        const ctas = [
            'Contact us today to learn more.',
            'Get in touch now for details.',
            'Message us for more information.',
            'Reach out to schedule a viewing.',
            'Call now to secure yours.',
        ];
        return ctas[Math.floor(Math.random() * ctas.length)];
    }
    formatPrice(price) {
        return price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        });
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
};
exports.AdWriterService = AdWriterService;
exports.AdWriterService = AdWriterService = __decorate([
    (0, common_1.Injectable)()
], AdWriterService);
//# sourceMappingURL=ad-writer.service.js.map