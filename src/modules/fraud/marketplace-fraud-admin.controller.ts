import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * =====================================================================
 * MARKETPLACE FRAUD ADMIN CONTROLLER
 * =====================================================================
 * Admin-only endpoints for fraud detection management
 * Requires admin authentication
 * =====================================================================
 */

@Controller('admin/fraud')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MarketplaceFraudAdminController {
  private readonly logger = new Logger(MarketplaceFraudAdminController.name);

  /**
   * =====================================================================
   * REVIEW QUEUE MANAGEMENT
   * =====================================================================
   */

  /**
   * Get review queue (pending manual reviews)
   */
  @Get('review-queue')
  async getReviewQueue(
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Admin fetching review queue: priority=${priority}, status=${status}`);

    // In production: Query fraud_review_queue table
    // SELECT * FROM fraud_review_queue
    // WHERE status = 'pending' (or specified status)
    // AND (priority = specified OR all)
    // ORDER BY priority DESC, created_at ASC
    // LIMIT specified

    return {
      items: [
        {
          id: 'review-1',
          userId: 'user-123',
          userEmail: 'suspect@example.com',
          priority: 'high',
          fraudScore: 78,
          reportCount: 4,
          reviewReason: 'multiple_reports',
          evidence: {
            signals: ['rapid_posting', 'duplicate_content', 'price_outlier'],
            recentAds: 25,
            verificationStatus: 'unverified',
          },
          createdAt: new Date(),
          hoursWaiting: 5.2,
        },
      ],
      pagination: {
        total: 15,
        page: 1,
        limit: limit || 20,
      },
    };
  }

  /**
   * Get specific review details
   */
  @Get('review-queue/:reviewId')
  async getReviewDetails(@Param('reviewId') reviewId: string) {
    this.logger.log(`Admin viewing review details: ${reviewId}`);

    // In production: Query detailed evidence
    // - User profile
    // - Fraud score history
    // - All events (ads, messages, reports)
    // - Device/IP patterns
    // - Enforcement history

    return {
      reviewId,
      user: {
        id: 'user-123',
        email: 'suspect@example.com',
        username: 'suspect_user',
        createdAt: new Date('2025-12-01'),
        verificationStatus: {
          email: false,
          phone: false,
          profileComplete: false,
        },
      },
      fraudScore: {
        current: 78,
        history: [
          { score: 45, date: new Date('2026-01-10') },
          { score: 62, date: new Date('2026-01-12') },
          { score: 78, date: new Date('2026-01-15') },
        ],
        riskLevel: 'high',
        topSignals: [
          { name: 'rapid_posting', score: 85, weight: 20 },
          { name: 'duplicate_content', score: 70, weight: 25 },
          { name: 'price_outlier', score: 60, weight: 15 },
        ],
      },
      activity: {
        adsCreated: 45,
        adsLast24h: 12,
        adsLast7d: 35,
        messagesLast24h: 25,
      },
      reports: [
        {
          reporterId: 'user-456',
          reason: 'scam',
          details: 'Selling fake items with stolen images',
          reportedAt: new Date('2026-01-14'),
        },
        {
          reporterId: 'user-789',
          reason: 'fake_ad',
          details: 'Price too good to be true',
          reportedAt: new Date('2026-01-15'),
        },
      ],
      enforcementHistory: [
        {
          action: 'warning',
          reason: 'High posting velocity',
          appliedAt: new Date('2026-01-10'),
        },
      ],
      deviceNetwork: {
        deviceCount: 3,
        ipCount: 8,
        countryChanges: 2,
        vpnDetected: true,
      },
    };
  }

  /**
   * Assign review to admin
   */
  @Put('review-queue/:reviewId/assign')
  async assignReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser() admin: any,
  ) {
    this.logger.log(`Admin ${admin.id} claimed review: ${reviewId}`);

    // In production: UPDATE fraud_review_queue
    // SET assigned_to = admin.id, assigned_at = NOW(), status = 'in_review'
    // WHERE id = reviewId AND status = 'pending'

    return {
      success: true,
      reviewId,
      assignedTo: admin.id,
      assignedAt: new Date(),
    };
  }

  /**
   * Complete review with decision
   */
  @Post('review-queue/:reviewId/complete')
  async completeReview(
    @Param('reviewId') reviewId: string,
    @Body()
    body: {
      decision: 'no_action' | 'warning' | 'soft_restriction' | 'temp_ban' | 'permanent_ban' | 'false_positive';
      reason: string;
      durationHours?: number; // For temp bans
    },
    @CurrentUser() admin: any,
  ) {
    this.logger.log(
      `Admin ${admin.id} completed review ${reviewId} with decision: ${body.decision}`,
    );

    // CRITICAL: Validate permanent ban decision
    if (body.decision === 'permanent_ban') {
      // Must provide comprehensive reason
      if (!body.reason || body.reason.length < 50) {
        return {
          success: false,
          error: 'Permanent ban requires detailed reason (min 50 characters)',
        };
      }

      // Log to immutable audit trail
      await this.logPermanentBan(reviewId, admin.id, body.reason);
    }

    // In production:
    // 1. UPDATE fraud_review_queue SET status = 'completed', review_decision = decision, reviewed_at = NOW(), review_notes = reason
    // 2. If action needed, INSERT INTO fraud_enforcement_actions
    // 3. INSERT INTO fraud_audit_logs for full audit trail

    return {
      success: true,
      reviewId,
      decision: body.decision,
      appliedBy: admin.id,
      appliedAt: new Date(),
    };
  }

  /**
   * =====================================================================
   * ENFORCEMENT ACTIONS
   * =====================================================================
   */

  /**
   * Get user's enforcement history
   */
  @Get('enforcement/:userId')
  async getEnforcementHistory(@Param('userId') userId: string) {
    this.logger.log(`Admin viewing enforcement history for user: ${userId}`);

    // In production: Query fraud_enforcement_actions
    // SELECT * FROM fraud_enforcement_actions WHERE user_id = userId ORDER BY created_at DESC

    return {
      userId,
      actions: [
        {
          id: 'action-1',
          actionType: 'warning',
          level: 1,
          reason: 'High posting velocity detected',
          fraudScore: 62,
          appliedAt: new Date('2026-01-10'),
          appliedBy: 'system',
          status: 'completed',
        },
        {
          id: 'action-2',
          actionType: 'soft_restriction',
          level: 1,
          reason: 'Multiple user reports received',
          fraudScore: 78,
          appliedAt: new Date('2026-01-15'),
          appliedBy: 'admin-456',
          status: 'active',
          expiresAt: new Date('2026-01-22'),
        },
      ],
    };
  }

  /**
   * Manually apply enforcement action
   */
  @Post('enforcement/:userId/apply')
  async applyEnforcement(
    @Param('userId') userId: string,
    @Body()
    body: {
      actionType: 'warning' | 'soft_restriction' | 'temp_ban' | 'permanent_ban';
      reason: string;
      durationHours?: number;
      restrictions?: any;
    },
    @CurrentUser() admin: any,
  ) {
    this.logger.log(
      `Admin ${admin.id} applying ${body.actionType} to user ${userId}`,
    );

    // CRITICAL VALIDATION for permanent bans
    if (body.actionType === 'permanent_ban') {
      const validation = await this.validatePermanentBan(userId, body.reason);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // In production:
    // INSERT INTO fraud_enforcement_actions
    // INSERT INTO fraud_audit_logs (IMMUTABLE)

    return {
      success: true,
      userId,
      action: body.actionType,
      appliedBy: admin.id,
      appliedAt: new Date(),
    };
  }

  /**
   * Lift enforcement action (appeal approved)
   */
  @Put('enforcement/:actionId/lift')
  async liftEnforcement(
    @Param('actionId') actionId: string,
    @Body() body: { reason: string },
    @CurrentUser() admin: any,
  ) {
    this.logger.log(`Admin ${admin.id} lifting enforcement action: ${actionId}`);

    // In production:
    // UPDATE fraud_enforcement_actions
    // SET status = 'lifted', lifted_at = NOW(), lifted_by = admin.id, lift_reason = reason
    // INSERT INTO fraud_audit_logs

    return {
      success: true,
      actionId,
      liftedBy: admin.id,
      liftedAt: new Date(),
      reason: body.reason,
    };
  }

  /**
   * =====================================================================
   * APPEALS MANAGEMENT
   * =====================================================================
   */

  /**
   * Get pending appeals
   */
  @Get('appeals')
  async getPendingAppeals(@Query('status') status?: string) {
    this.logger.log(`Admin fetching appeals: status=${status}`);

    // In production: Query fraud_appeals
    // JOIN with fraud_enforcement_actions to get context

    return {
      items: [
        {
          id: 'appeal-1',
          userId: 'user-123',
          userEmail: 'user@example.com',
          enforcementAction: {
            type: 'temp_ban',
            reason: 'High fraud score',
            appliedAt: new Date('2026-01-15'),
          },
          appealText:
            'I believe this was a mistake. I was posting multiple ads because I am moving and selling furniture. All items are legitimate.',
          evidenceUrls: ['https://example.com/photo1.jpg'],
          submittedAt: new Date('2026-01-16'),
          status: 'pending',
        },
      ],
    };
  }

  /**
   * Review appeal
   */
  @Post('appeals/:appealId/review')
  async reviewAppeal(
    @Param('appealId') appealId: string,
    @Body()
    body: {
      decision: 'approved' | 'rejected';
      reviewNotes: string;
    },
    @CurrentUser() admin: any,
  ) {
    this.logger.log(
      `Admin ${admin.id} reviewing appeal ${appealId}: ${body.decision}`,
    );

    // In production:
    // UPDATE fraud_appeals SET status = decision, reviewed_by = admin.id, reviewed_at = NOW()
    // If approved: Lift enforcement action
    // INSERT INTO fraud_audit_logs

    return {
      success: true,
      appealId,
      decision: body.decision,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    };
  }

  /**
   * =====================================================================
   * ANALYTICS & MONITORING
   * =====================================================================
   */

  /**
   * Get fraud detection statistics
   */
  @Get('stats')
  async getFraudStats(@Query('days') days: number = 7) {
    this.logger.log(`Admin viewing fraud stats for last ${days} days`);

    return {
      period: `last_${days}_days`,
      reviewQueue: {
        pending: 15,
        inReview: 8,
        completed: 127,
      },
      actions: {
        warnings: 45,
        softRestrictions: 23,
        tempBans: 12,
        permanentBans: 2,
      },
      appeals: {
        pending: 5,
        approved: 8,
        rejected: 12,
      },
      topSignals: [
        { name: 'rapid_posting', count: 67 },
        { name: 'duplicate_content', count: 45 },
        { name: 'price_outlier', count: 38 },
      ],
      riskDistribution: {
        low: 8542,
        medium: 234,
        high: 45,
        critical: 12,
      },
    };
  }

  /**
   * Get audit log
   */
  @Get('audit-log')
  async getAuditLog(
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: string,
    @Query('limit') limit: number = 50,
  ) {
    this.logger.log('Admin viewing audit log');

    // In production: Query fraud_audit_logs (IMMUTABLE table)
    // Full audit trail for compliance

    return {
      items: [
        {
          id: 'audit-1',
          actionType: 'enforcement_applied',
          userId: 'user-123',
          adminId: 'admin-456',
          beforeState: { fraudScore: 62 },
          afterState: { fraudScore: 78, action: 'soft_restriction' },
          reason: 'Multiple reports received',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
        },
      ],
      pagination: {
        total: 1523,
        limit,
      },
    };
  }

  /**
   * =====================================================================
   * CONFIGURATION MANAGEMENT
   * =====================================================================
   */

  /**
   * Get fraud detection configuration
   */
  @Get('config')
  async getConfig() {
    // In production: Query fraud_config table
    return {
      scoreThresholds: { low: [0, 30], medium: [31, 60], high: [61, 80], critical: [81, 100] },
      signalWeights: {
        newAccount: 15,
        rapidPosting: 20,
        duplicateContent: 25,
      },
      rateLimits: {
        maxAdsPerDay: 30,
        maxAdsPerHour: 5,
      },
      banCriteria: {
        tempBanScore: 75,
        permBanMinScore: 85,
        permBanMinReports: 3,
      },
    };
  }

  /**
   * Update configuration
   */
  @Put('config')
  async updateConfig(
    @Body() config: any,
    @CurrentUser() admin: any,
  ) {
    this.logger.log(`Admin ${admin.id} updating fraud detection config`);

    // In production: UPDATE fraud_config table
    // Log to audit trail

    return {
      success: true,
      updatedBy: admin.id,
      updatedAt: new Date(),
    };
  }

  /**
   * =====================================================================
   * PRIVATE HELPERS
   * =====================================================================
   */

  /**
   * Validate permanent ban decision (CRITICAL)
   */
  private async validatePermanentBan(
    userId: string,
    reason: string,
  ): Promise<{ allowed: boolean; error?: string }> {
    // Must have comprehensive reason
    if (!reason || reason.length < 50) {
      return {
        allowed: false,
        error: 'Permanent ban requires detailed reason (min 50 characters)',
      };
    }

    // In production: Check ban criteria
    // - High fraud score over time
    // - Multiple reports
    // - Previous warnings/bans
    // - All criteria must be met

    // Placeholder validation
    const meetsAllCriteria = true;

    if (!meetsAllCriteria) {
      return {
        allowed: false,
        error: 'User does not meet all permanent ban criteria',
      };
    }

    return { allowed: true };
  }

  /**
   * Log permanent ban to immutable audit trail
   */
  private async logPermanentBan(
    reviewId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    // In production: INSERT INTO fraud_audit_logs
    // This table is IMMUTABLE for compliance
    this.logger.warn(
      `PERMANENT BAN APPLIED - Review: ${reviewId}, Admin: ${adminId}, Reason: ${reason}`,
    );
  }
}
