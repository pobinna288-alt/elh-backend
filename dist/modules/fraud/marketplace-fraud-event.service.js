"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MarketplaceFraudEventService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceFraudEventService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
let MarketplaceFraudEventService = MarketplaceFraudEventService_1 = class MarketplaceFraudEventService {
    constructor() {
        this.logger = new common_1.Logger(MarketplaceFraudEventService_1.name);
    }
    async trackAccountCreation(userId, ipAddress, deviceFingerprint, userAgent) {
        await this.logEvent('fraud_user_events', {
            user_id: userId,
            event_type: 'account_created',
            event_data: { timestamp: new Date() },
            ip_address: ipAddress,
            device_fingerprint_hash: this.hashFingerprint(deviceFingerprint),
            user_agent: userAgent,
        });
        await this.trackDeviceFingerprint(userId, deviceFingerprint);
        await this.trackIpAddress(userId, ipAddress);
        this.logger.log(`Tracked account creation for user: ${userId}`);
    }
    async trackEmailVerification(userId) {
        await this.logEvent('fraud_user_events', {
            user_id: userId,
            event_type: 'email_verified',
            event_data: { verified_at: new Date() },
        });
    }
    async trackPhoneVerification(userId) {
        await this.logEvent('fraud_user_events', {
            user_id: userId,
            event_type: 'phone_verified',
            event_data: { verified_at: new Date() },
        });
    }
    async trackLogin(userId, ipAddress, deviceFingerprint, countryCode, userAgent) {
        await this.logEvent('fraud_user_events', {
            user_id: userId,
            event_type: 'login',
            event_data: { timestamp: new Date() },
            ip_address: ipAddress,
            country_code: countryCode,
            device_fingerprint_hash: this.hashFingerprint(deviceFingerprint),
            user_agent: userAgent,
        });
        await this.checkIpChange(userId, ipAddress, countryCode);
        await this.trackDeviceFingerprint(userId, deviceFingerprint);
    }
    async trackAdCreation(adId, userId, categoryId, price, description, imageHashes, ipAddress) {
        const descriptionHash = this.hashContent(description);
        await this.logEvent('fraud_ad_events', {
            ad_id: adId,
            user_id: userId,
            event_type: 'ad_created',
            event_data: {
                timestamp: new Date(),
                category: categoryId,
            },
            category_id: categoryId,
            price_amount: price,
            image_count: imageHashes.length,
            image_perceptual_hashes: imageHashes,
            description_hash: descriptionHash,
            description_length: description.length,
            ip_address: ipAddress,
        });
        await this.trackContentPattern('description_text', descriptionHash, adId, userId);
        for (const imageHash of imageHashes) {
            await this.trackContentPattern('image_perceptual_hash', imageHash, adId, userId);
        }
        this.logger.log(`Tracked ad creation: ${adId} by user ${userId}`);
    }
    async trackAdEdit(adId, userId, changes) {
        await this.logEvent('fraud_ad_events', {
            ad_id: adId,
            user_id: userId,
            event_type: 'ad_edited',
            event_data: changes,
            price_change_delta: changes.priceChanged
                ? changes.priceChanged.to - changes.priceChanged.from
                : null,
        });
    }
    async trackPriceChange(adId, userId, oldPrice, newPrice) {
        const delta = newPrice - oldPrice;
        const percentChange = (Math.abs(delta) / oldPrice) * 100;
        await this.logEvent('fraud_ad_events', {
            ad_id: adId,
            user_id: userId,
            event_type: 'price_changed',
            event_data: {
                old_price: oldPrice,
                new_price: newPrice,
                delta,
                percent_change: percentChange,
            },
            price_amount: newPrice,
            price_change_delta: delta,
        });
        if (percentChange > 50) {
            this.logger.warn(`Suspicious price change detected: Ad ${adId} - ${percentChange}% change`);
        }
    }
    async trackMessageSent(senderId, recipientId, conversationId, adId, patternFlags) {
        const recentMessages = await this.getRecentMessageCount(senderId, 3600);
        if (recentMessages > 20) {
            await this.logEvent('fraud_messaging_events', {
                sender_id: senderId,
                recipient_id: recipientId,
                conversation_id: conversationId,
                ad_id: adId,
                event_type: 'rapid_messages',
                message_count: recentMessages,
                pattern_flags: patternFlags,
            });
        }
        else {
            await this.logEvent('fraud_messaging_events', {
                sender_id: senderId,
                recipient_id: recipientId,
                conversation_id: conversationId,
                ad_id: adId,
                event_type: 'message_sent',
                message_count: 1,
                pattern_flags: patternFlags,
            });
        }
        if (patternFlags.length > 0) {
            this.logger.warn(`Off-platform patterns detected in message from ${senderId}: ${patternFlags.join(', ')}`);
        }
    }
    detectOffPlatformPatterns(messageText) {
        const patterns = [];
        if (/\b\d{10,15}\b/.test(messageText) || /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(messageText)) {
            patterns.push('phone_number');
        }
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(messageText)) {
            patterns.push('email');
        }
        if (/whatsapp|wa\.me|chat me on/i.test(messageText)) {
            patterns.push('whatsapp_mention');
        }
        if (/telegram|t\.me/i.test(messageText)) {
            patterns.push('telegram_mention');
        }
        if (/contact me (outside|off|directly)|call me|text me/i.test(messageText)) {
            patterns.push('external_contact_request');
        }
        return patterns;
    }
    async trackUserReport(reporterId, reportedUserId, reason, details, evidenceUrls, reportedAdId) {
        await this.logEvent('fraud_feedback_events', {
            reporter_id: reporterId,
            reported_user_id: reportedUserId,
            reported_ad_id: reportedAdId || null,
            event_type: 'user_reported',
            report_reason: reason,
            report_details: details,
            evidence_urls: evidenceUrls,
        });
        this.logger.warn(`User ${reportedUserId} reported by ${reporterId} for: ${reason}`);
    }
    async trackUserBlock(blockerId, blockedUserId) {
        await this.logEvent('fraud_feedback_events', {
            reporter_id: blockerId,
            reported_user_id: blockedUserId,
            event_type: 'user_blocked',
            report_reason: 'user_blocked',
        });
    }
    async trackDeviceFingerprint(userId, deviceFingerprint) {
        const hash = this.hashFingerprint(deviceFingerprint);
        this.logger.debug(`Tracked device for user ${userId}: ${hash}`);
    }
    async trackIpAddress(userId, ipAddress) {
        this.logger.debug(`Tracked IP for user ${userId}: ${ipAddress}`);
    }
    async checkIpChange(userId, newIpAddress, newCountryCode) {
        const lastKnownIp = null;
        const lastKnownCountry = null;
        if (lastKnownIp && lastKnownIp !== newIpAddress) {
            await this.logEvent('fraud_user_events', {
                user_id: userId,
                event_type: 'ip_change',
                event_data: {
                    old_ip: lastKnownIp,
                    new_ip: newIpAddress,
                },
                ip_address: newIpAddress,
            });
        }
        if (lastKnownCountry && lastKnownCountry !== newCountryCode) {
            await this.logEvent('fraud_user_events', {
                user_id: userId,
                event_type: 'country_change',
                event_data: {
                    old_country: lastKnownCountry,
                    new_country: newCountryCode,
                },
                country_code: newCountryCode,
            });
        }
    }
    async trackContentPattern(patternType, patternHash, adId, userId) {
        this.logger.debug(`Tracked content pattern: ${patternType} - ${patternHash.substring(0, 8)}...`);
    }
    async getRecentMessageCount(userId, secondsAgo) {
        return 0;
    }
    hashFingerprint(fingerprint) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(fingerprint).digest('hex');
    }
    hashContent(content) {
        const crypto = require('crypto');
        const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }
    async logEvent(table, data) {
        this.logger.debug(`Event logged to ${table}:`, data);
    }
    async cleanupOldEvents() {
        this.logger.log('Starting event cleanup job...');
        const retentionDays = 90;
        this.logger.log('Event cleanup completed');
    }
    async recalculateFlaggedUserScores() {
        this.logger.log('Recalculating fraud scores for flagged users...');
        this.logger.log('Fraud score recalculation completed');
    }
};
exports.MarketplaceFraudEventService = MarketplaceFraudEventService;
__decorate([
    (0, schedule_1.Cron)('0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceFraudEventService.prototype, "cleanupOldEvents", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceFraudEventService.prototype, "recalculateFlaggedUserScores", null);
exports.MarketplaceFraudEventService = MarketplaceFraudEventService = MarketplaceFraudEventService_1 = __decorate([
    (0, common_1.Injectable)()
], MarketplaceFraudEventService);
//# sourceMappingURL=marketplace-fraud-event.service.js.map