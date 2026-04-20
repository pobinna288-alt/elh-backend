import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * =====================================================================
 * MARKETPLACE FRAUD EVENT TRACKING SERVICE
 * =====================================================================
 * Records all user, ad, and messaging events for fraud detection
 * Backend-only - frontend just sends events
 * =====================================================================
 */

@Injectable()
export class MarketplaceFraudEventService {
  private readonly logger = new Logger(MarketplaceFraudEventService.name);

  /**
   * =====================================================================
   * USER EVENTS
   * =====================================================================
   */

  /**
   * Track account creation
   */
  async trackAccountCreation(
    userId: string,
    ipAddress: string,
    deviceFingerprint: string,
    userAgent: string,
  ): Promise<void> {
    await this.logEvent('fraud_user_events', {
      user_id: userId,
      event_type: 'account_created',
      event_data: { timestamp: new Date() },
      ip_address: ipAddress,
      device_fingerprint_hash: this.hashFingerprint(deviceFingerprint),
      user_agent: userAgent,
    });

    // Update device fingerprint tracking
    await this.trackDeviceFingerprint(userId, deviceFingerprint);
    await this.trackIpAddress(userId, ipAddress);

    this.logger.log(`Tracked account creation for user: ${userId}`);
  }

  /**
   * Track email verification
   */
  async trackEmailVerification(userId: string): Promise<void> {
    await this.logEvent('fraud_user_events', {
      user_id: userId,
      event_type: 'email_verified',
      event_data: { verified_at: new Date() },
    });
  }

  /**
   * Track phone verification
   */
  async trackPhoneVerification(userId: string): Promise<void> {
    await this.logEvent('fraud_user_events', {
      user_id: userId,
      event_type: 'phone_verified',
      event_data: { verified_at: new Date() },
    });
  }

  /**
   * Track user login
   */
  async trackLogin(
    userId: string,
    ipAddress: string,
    deviceFingerprint: string,
    countryCode: string,
    userAgent: string,
  ): Promise<void> {
    await this.logEvent('fraud_user_events', {
      user_id: userId,
      event_type: 'login',
      event_data: { timestamp: new Date() },
      ip_address: ipAddress,
      country_code: countryCode,
      device_fingerprint_hash: this.hashFingerprint(deviceFingerprint),
      user_agent: userAgent,
    });

    // Check for IP/country changes
    await this.checkIpChange(userId, ipAddress, countryCode);
    await this.trackDeviceFingerprint(userId, deviceFingerprint);
  }

  /**
   * =====================================================================
   * AD EVENTS
   * =====================================================================
   */

  /**
   * Track ad creation
   */
  async trackAdCreation(
    adId: string,
    userId: string,
    categoryId: string,
    price: number,
    description: string,
    imageHashes: string[],
    ipAddress: string,
  ): Promise<void> {
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

    // Track content patterns for duplicate detection
    await this.trackContentPattern('description_text', descriptionHash, adId, userId);
    for (const imageHash of imageHashes) {
      await this.trackContentPattern('image_perceptual_hash', imageHash, adId, userId);
    }

    this.logger.log(`Tracked ad creation: ${adId} by user ${userId}`);
  }

  /**
   * Track ad editing
   */
  async trackAdEdit(
    adId: string,
    userId: string,
    changes: {
      priceChanged?: { from: number; to: number };
      descriptionChanged?: boolean;
      imagesChanged?: boolean;
    },
  ): Promise<void> {
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

  /**
   * Track price change (suspicious if frequent or dramatic)
   */
  async trackPriceChange(
    adId: string,
    userId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
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

    // Flag suspicious price changes
    if (percentChange > 50) {
      this.logger.warn(
        `Suspicious price change detected: Ad ${adId} - ${percentChange}% change`,
      );
    }
  }

  /**
   * =====================================================================
   * MESSAGING EVENTS
   * =====================================================================
   */

  /**
   * Track message sent (metadata only - NO message content)
   */
  async trackMessageSent(
    senderId: string,
    recipientId: string,
    conversationId: string,
    adId: string,
    patternFlags: string[],
  ): Promise<void> {
    // Check for rapid messaging
    const recentMessages = await this.getRecentMessageCount(senderId, 3600); // Last hour

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
    } else {
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

    // Flag off-platform patterns (without exposing content)
    if (patternFlags.length > 0) {
      this.logger.warn(
        `Off-platform patterns detected in message from ${senderId}: ${patternFlags.join(', ')}`,
      );
    }
  }

  /**
   * Detect off-platform contact patterns (backend regex, no content storage)
   */
  detectOffPlatformPatterns(messageText: string): string[] {
    const patterns: string[] = [];

    // Phone number patterns (various formats)
    if (/\b\d{10,15}\b/.test(messageText) || /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(messageText)) {
      patterns.push('phone_number');
    }

    // Email patterns
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(messageText)) {
      patterns.push('email');
    }

    // WhatsApp mentions
    if (/whatsapp|wa\.me|chat me on/i.test(messageText)) {
      patterns.push('whatsapp_mention');
    }

    // Telegram mentions
    if (/telegram|t\.me/i.test(messageText)) {
      patterns.push('telegram_mention');
    }

    // Generic "contact me outside" patterns
    if (/contact me (outside|off|directly)|call me|text me/i.test(messageText)) {
      patterns.push('external_contact_request');
    }

    return patterns;
  }

  /**
   * =====================================================================
   * COMMUNITY FEEDBACK
   * =====================================================================
   */

  /**
   * Track user report
   */
  async trackUserReport(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    details: string,
    evidenceUrls: string[],
    reportedAdId?: string,
  ): Promise<void> {
    await this.logEvent('fraud_feedback_events', {
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reported_ad_id: reportedAdId || null,
      event_type: 'user_reported',
      report_reason: reason,
      report_details: details,
      evidence_urls: evidenceUrls,
    });

    // Trigger fraud score recalculation for reported user
    // This would call the scoring service
    this.logger.warn(
      `User ${reportedUserId} reported by ${reporterId} for: ${reason}`,
    );
  }

  /**
   * Track user blocking another user
   */
  async trackUserBlock(
    blockerId: string,
    blockedUserId: string,
  ): Promise<void> {
    await this.logEvent('fraud_feedback_events', {
      reporter_id: blockerId,
      reported_user_id: blockedUserId,
      event_type: 'user_blocked',
      report_reason: 'user_blocked',
    });
  }

  /**
   * =====================================================================
   * PATTERN TRACKING HELPERS
   * =====================================================================
   */

  /**
   * Track device fingerprint for multi-account detection
   */
  private async trackDeviceFingerprint(
    userId: string,
    deviceFingerprint: string,
  ): Promise<void> {
    const hash = this.hashFingerprint(deviceFingerprint);

    // In production: Upsert into fraud_device_fingerprints
    // Check if this device is associated with multiple accounts
    // If user_count > 5, flag as suspicious

    this.logger.debug(`Tracked device for user ${userId}: ${hash}`);
  }

  /**
   * Track IP address reputation
   */
  private async trackIpAddress(
    userId: string,
    ipAddress: string,
  ): Promise<void> {
    // In production: Upsert into fraud_ip_reputation
    // Check for VPN/proxy using external service (IPQualityScore, etc.)
    // Track how many users share this IP

    this.logger.debug(`Tracked IP for user ${userId}: ${ipAddress}`);
  }

  /**
   * Check for IP address changes (VPN hopping)
   */
  private async checkIpChange(
    userId: string,
    newIpAddress: string,
    newCountryCode: string,
  ): Promise<void> {
    // In production: Query last known IP from fraud_user_events
    // If IP changed, log ip_change event
    // If country changed, log country_change event

    const lastKnownIp = null; // Placeholder
    const lastKnownCountry = null; // Placeholder

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

  /**
   * Track content patterns for duplicate detection
   */
  private async trackContentPattern(
    patternType: 'description_text' | 'image_perceptual_hash',
    patternHash: string,
    adId: string,
    userId: string,
  ): Promise<void> {
    // In production: Upsert into fraud_content_patterns
    // Increment occurrence_count
    // If occurrence_count > threshold, flag as suspicious

    this.logger.debug(
      `Tracked content pattern: ${patternType} - ${patternHash.substring(0, 8)}...`,
    );
  }

  /**
   * Get recent message count for rate limiting
   */
  private async getRecentMessageCount(
    userId: string,
    secondsAgo: number,
  ): Promise<number> {
    // In production: Query fraud_messaging_events
    // COUNT(*) WHERE sender_id = userId AND created_at > NOW() - INTERVAL seconds
    return 0; // Placeholder
  }

  /**
   * =====================================================================
   * UTILITY FUNCTIONS
   * =====================================================================
   */

  /**
   * Hash device fingerprint for privacy
   */
  private hashFingerprint(fingerprint: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Hash content for duplicate detection
   */
  private hashContent(content: string): string {
    const crypto = require('crypto');
    // Normalize content (lowercase, remove extra spaces)
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Generic event logging
   */
  private async logEvent(table: string, data: any): Promise<void> {
    // In production: Insert into appropriate table
    this.logger.debug(`Event logged to ${table}:`, data);
  }

  /**
   * =====================================================================
   * BACKGROUND JOBS
   * =====================================================================
   */

  /**
   * Cleanup old events (keep 90 days hot, archive rest)
   * Runs daily at 3 AM
   */
  @Cron('0 3 * * *')
  async cleanupOldEvents(): Promise<void> {
    this.logger.log('Starting event cleanup job...');

    const retentionDays = 90;

    // In production:
    // DELETE FROM fraud_user_events WHERE created_at < NOW() - INTERVAL '90 days'
    // Or move to archive table for compliance

    this.logger.log('Event cleanup completed');
  }

  /**
   * Recalculate fraud scores for flagged users
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateFlaggedUserScores(): Promise<void> {
    this.logger.log('Recalculating fraud scores for flagged users...');

    // In production: Query users with recent suspicious activity
    // Call scoring service for each
    // Update fraud_user_scores table

    this.logger.log('Fraud score recalculation completed');
  }
}
