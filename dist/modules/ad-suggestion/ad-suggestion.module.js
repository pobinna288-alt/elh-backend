"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdSuggestionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ad_suggestion_controller_1 = require("./ad-suggestion.controller");
const ad_suggestion_service_1 = require("./ad-suggestion.service");
const ad_suggestion_log_entity_1 = require("./entities/ad-suggestion-log.entity");
let AdSuggestionModule = class AdSuggestionModule {
};
exports.AdSuggestionModule = AdSuggestionModule;
exports.AdSuggestionModule = AdSuggestionModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ad_suggestion_log_entity_1.AdSuggestionLog])],
        controllers: [ad_suggestion_controller_1.AdSuggestionController],
        providers: [ad_suggestion_service_1.AdSuggestionService],
        exports: [ad_suggestion_service_1.AdSuggestionService],
    })
], AdSuggestionModule);
//# sourceMappingURL=ad-suggestion.module.js.map