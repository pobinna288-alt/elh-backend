import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * =====================================================================
 * MARKETPLACE FRAUD DECISION ENGINE
 * =====================================================================
 * Makes enforcement decisions based on fraud scores
 * Implements 3-level progressive enforcement system
 * NEVER makes permanent bans without human review
 * =====================================================================
 */

interface EnforcementDecision {
  action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reason: string;
  restrictions?: {
    canPost?: boolean;
    canMessage?: boolean;
    adsHidden?: boolean;
    reducedVisibility?: boolean;
  };
  durationHours?: number;       // For BLOCK (temp suspension)
  requiresManualReview: boolean;
  notifyUser: boolean;
  evidence: any;
}

interface UserEnforcementContext {
  userId: string;
  currentScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  previousWarnings: number;
  previousTempBans: number;
  previousPermanentBans: number;
  reportsReceived: number;
  daysSinceLastViolation: number;
  activeRestrictions: any[];
}

@Injectable()
export class MarketplaceFraudDecisionService {
  private readonly logger = new Logger(MarketplaceFraudDecisionService.name);

  /**
   * =====================================================================
   * MAIN DECISION FUNCTION
   * =====================================================================
   */

  /**
   * Make enforcement decision based on fraud score and context
   * This is the core decision engine
   */
  async makeEnforcementDecision(
    context: UserEnforcementContext,
  ): Promise<EnforcementDecision> {
    this.logger.log(
      `Making enforcement decision for user ${context.userId} - Score: ${context.currentScore}, Risk: ${context.riskLevel}`,
    );

    // Check if user already has active restrictions
    if (context.activeRestrictions.length > 0) {
      return this.handleExistingRestrictions(context);
    }

    // Route to appropriate decision based on risk level and history
    switch (context.riskLevel) {
      case 'low':
        return this.handleLowRisk(context);

      case 'medium':
        return this.handleMediumRisk(context);

      case 'high':
        return this.handleHighRisk(context);

      case 'critical':
        return this.handleCriticalRisk(context);

      default:
        return {
          action: 'ALLOW',
          reason: 'Unknown risk level – defaulting to allow',
          requiresManualReview: false,
          notifyUser: false,
          evidence: context,
        };
    }
  }

  /**
   * =====================================================================
   * RISK LEVEL HANDLERS
   * =====================================================================
   */

  /**
   * LOW RISK (0–39): ALLOW
   */
  private handleLowRisk(
    context: UserEnforcementContext,
  ): EnforcementDecision {
    return {
      action: 'ALLOW',
      reason: 'Low fraud risk. Continue monitoring.',
      requiresManualReview: false,
      notifyUser: false,
      evidence: { score: context.currentScore },
    };
  }

  /**
   * MEDIUM RISK (40–69): ALLOW (buyer safety tip, seller unaware)
   */
  private handleMediumRisk(
    context: UserEnforcementContext,
  ): EnforcementDecision {
    // Repeat offenders escalate to REVIEW
    if (context.previousWarnings >= 2 || context.previousTempBans > 0) {
      return this.handleHighRisk(context);
    }

    return {
      action: 'ALLOW',
      reason: 'Medium risk. Buyer safety warnings shown. Seller monitored.',
      restrictions: { canPost: true, canMessage: true, adsHidden: false, reducedVisibility: false },
      requiresManualReview: false,
      notifyUser: false,
      evidence: { score: context.currentScore, buyerWarningEnabled: true },
    };
  }

  /**
   * HIGH RISK (40–69 with history, or 70+): REVIEW
   */
  private handleHighRisk(
    context: UserEnforcementContext,
  ): EnforcementDecision {
    // Escalate to BLOCK if repeat offender
    if (context.previousTempBans >= 2) {
      return this.handleCriticalRisk(context);
    }

    return {
      action: 'REVIEW',
      reason: 'High fraud risk. Reducing visibility, queued for manual review.',
      restrictions: { canPost: true, canMessage: true, adsHidden: false, reducedVisibility: true },
      requiresManualReview: true,
      notifyUser: true,
      evidence: { score: context.currentScore, reports: context.reportsReceived },
    };
  }

  /**
   * CRITICAL RISK (70+ with history): BLOCK (temp suspension + mandatory review)
   */
  private handleCriticalRisk(
    context: UserEnforcementContext,
  ): EnforcementDecision {
    const meetsAllCriteria = this.checkPermanentBanCriteria(context);
    const durationHours = this.calculateTempBanDuration(context);

    if (meetsAllCriteria) {
      this.logger.warn(
        `User ${context.userId} meets all permanent ban criteria – flagging for urgent admin review`,
      );
    }

    return {
      action: 'BLOCK',
      reason: meetsAllCriteria
        ? 'Meets permanent ban criteria. URGENT manual review required.'
        : 'Critical fraud risk. Temporary suspension. Mandatory review.',
      restrictions: { canPost: false, canMessage: false, adsHidden: true, reducedVisibility: true },
      durationHours,
      requiresManualReview: true,
      notifyUser: true,
      evidence: {
        score: context.currentScore,
        previousWarnings: context.previousWarnings,
        previousTempBans: context.previousTempBans,
        reportsReceived: context.reportsReceived,
        permanentBanCandidate: meetsAllCriteria,
        requiresAdminApproval: meetsAllCriteria,
      },
    };
  }

  /**
   * =====================================================================
   * PERMANENT BAN CRITERIA (STRICT)
   * =====================================================================
   */

  /**
   * Check if user meets ALL criteria for permanent ban consideration
   * This is VERY strict - false positives are UNACCEPTABLE
   */
  private checkPermanentBanCriteria(
    context: UserEnforcementContext,
  ): boolean {
    const criteria = {
      highScoreOverTime: context.currentScore >= 85,
      multipleReports: context.reportsReceived >= 3,
      previousWarnings: context.previousWarnings >= 2,
      previousTempBans: context.previousTempBans >= 2,
      recentActivity: context.daysSinceLastViolation <= 30, // Still offending
    };

    this.logger.log(
      `Permanent ban criteria check for user ${context.userId}:`,
      criteria,
    );

    // ALL criteria must be true
    const allCriteriaMet = Object.values(criteria).every(
      (criterion) => criterion === true,
    );

    if (allCriteriaMet) {
      this.logger.warn(
        `User ${context.userId} meets ALL permanent ban criteria - flagging for urgent review`,
      );
    }

    return allCriteriaMet;
  }

  /**
   * =====================================================================
   * HELPER FUNCTIONS
   * =====================================================================
   */

  /**
   * Handle cases where user already has active restrictions
   */
  private handleExistingRestrictions(
    context: UserEnforcementContext,
  ): EnforcementDecision {
    const hasActiveTempBan = context.activeRestrictions.some(
      (r) => r.action_type === 'temp_ban' || r.action === 'BLOCK',
    );
    const hasActivePermanentBan = context.activeRestrictions.some(
      (r) => r.action_type === 'permanent_ban',
    );

    if (hasActivePermanentBan) {
      return {
        action: 'BLOCK',
        reason: 'User is permanently banned.',
        requiresManualReview: false,
        notifyUser: false,
        evidence: { activeRestrictions: context.activeRestrictions },
      };
    }

    if (hasActiveTempBan && context.currentScore >= 70) {
      return {
        action: 'BLOCK',
        reason: 'Fraud score increased during suspension. Escalating to urgent review.',
        requiresManualReview: true,
        notifyUser: false,
        evidence: { score: context.currentScore, activeRestrictions: context.activeRestrictions },
      };
    }

    return {
      action: 'REVIEW',
      reason: 'Active restrictions in place. Continued monitoring.',
      requiresManualReview: false,
      notifyUser: false,
      evidence: { activeRestrictions: context.activeRestrictions },
    };
  }

  /**
   * Calculate appropriate temporary ban duration
   */
  private calculateTempBanDuration(
    context: UserEnforcementContext,
  ): number {
    // Base duration: 24 hours
    let duration = 24;

    // Add 24 hours for each previous temp ban (up to 72 hours max)
    duration += context.previousTempBans * 24;

    // Cap at 72 hours
    duration = Math.min(72, duration);

    // If critical score (85+), use maximum duration
    if (context.currentScore >= 85) {
      duration = 72;
    }

    this.logger.log(
      `Calculated temp ban duration for user ${context.userId}: ${duration} hours`,
    );

    return duration;
  }

  /**
   * =====================================================================
   * AD-SPECIFIC DECISIONS
   * =====================================================================
   */

  /**
   * Make enforcement decision for a specific ad
   */
  async makeAdEnforcementDecision(
    adScore: number,
    userScore: number,
  ): Promise<{
    action: 'ALLOW' | 'REVIEW' | 'BLOCK';
    reason: string;
    requiresReview: boolean;
  }> {
    // Critical ad score – block immediately
    if (adScore >= 70 || userScore >= 70) {
      return {
        action: 'BLOCK',
        reason: 'Critical fraud risk in ad or seller account.',
        requiresReview: true,
      };
    }

    // Medium-high risk – queue for review
    if (adScore >= 40 || userScore >= 40) {
      return {
        action: 'REVIEW',
        reason: 'Elevated risk. Ad queued for review with buyer safety warnings.',
        requiresReview: true,
      };
    }

    return {
      action: 'ALLOW',
      reason: 'Low risk. Ad approved.',
      requiresReview: false,
    };
  }

  /**
   * Log enforcement decision to audit trail
   */
  async logEnforcementDecision(
    userId: string,
    decision: EnforcementDecision,
    adminId?: string,
  ): Promise<void> {
    this.logger.log(
      `Enforcement decision for user ${userId}: ${decision.action}`,
    );

    // In production: Insert into fraud_audit_logs table
    // await this.auditLogRepository.insert({
    //   action_type: 'enforcement_decision',
    //   user_id: userId,
    //   admin_id: adminId || null,
    //   before_state: {},
    //   after_state: decision,
    //   reason: decision.reason,
    //   metadata: decision.evidence
    // });
  }
}
