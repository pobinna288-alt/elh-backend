"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdRewriteService = void 0;
const common_1 = require("@nestjs/common");
let AdRewriteService = class AdRewriteService {
    async rewriteDescription(userText) {
        const words = userText.trim().split(/\s+/);
        const cleanText = userText
            .replace(/[!]+/g, '.')
            .replace(/[?]+/g, '.')
            .replace(/\.{2,}/g, '.')
            .replace(/\s+/g, ' ')
            .trim();
        if (words.length > 25) {
            return words.slice(0, 25).join(' ') + '.';
        }
        if (!cleanText.endsWith('.')) {
            return cleanText + '.';
        }
        return cleanText;
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
};
exports.AdRewriteService = AdRewriteService;
exports.AdRewriteService = AdRewriteService = __decorate([
    (0, common_1.Injectable)()
], AdRewriteService);
//# sourceMappingURL=ad-rewrite.service.js.map