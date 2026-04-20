import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * =====================================================================
 * MARKETPLACE FRAUD SCORING ENGINE
 * =====================================================================
 * Backend-only fraud detection scoring system
 * Combines multiple signals to produce a 0-100 fraud risk score
 * NEVER makes permanent ban decisions alone
 * =====================================================================
 */

interface FraudSignal {
  name: string;
  score: number; // 0-100
  weight: number; // 0-100
  evidence: any;
}

interface FraudScoreResult {
  userId: string;
  finalScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: FraudSignal[];
  recommendation: string;
  requiresReview: boolean;
}

interface UserContext {
  userId: string;
  accountAgeHours: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  adsCreatedLast24h: number;
  adsCreatedLast7d: number;
  totalAdsCreated: number;
  messagesLast1h: number;
  reportsReceived: number;
  previousWarnings: number;
  previousTempBans: number;
  previousPermanentBans: number;
  ipChangesLast7d: number;
  countryChangesLast7d: number;
  deviceCount: number;
}

interface AdContext {
  adId: string;
  userId: string;
  categoryId: string;
  priceAmount: number;
  categoryAveragePrice?: number;
  descriptionHash: string;
  imagePerceptualHashes: string[];
  createdAt: Date;
}

@Injectable()
export class MarketplaceFraudScoringService {
  private readonly logger = new Logger(MarketplaceFraudScoringService.name);

  // MVP signal weights – 6–7 highest-signal features only
  private signalWeights = {
    newAccount:       15,  // account age
    rapidPosting:     20,  // velocity
    highReports:      30,  // community feedback
    previousBans:     40,  // enforcement history (highest signal)
    deviceSharing:    20,  // device count
    ipShifting:       15,  // IP rate limit / changes
    duplicateContent: 25,  // content + image duplication (merged)
  };

  // Risk level thresholds
  private riskThresholds = {
    low: { min: 0, max: 30 },
    medium: { min: 31, max: 60 },
    high: { min: 61, max: 80 },
    critical: { min: 81, max: 100 },
  };

  /**
   * =====================================================================
   * MAIN SCORING FUNCTIONS
   * =====================================================================
   */

  /**
   * Calculate comprehensive fraud score for a user
   * Combines multiple signals with weighted scoring
   */
  async calculateUserFraudScore(
    userContext: UserContext,
  ): Promise<FraudScoreResult> {
    this.logger.log(
      `Calculating fraud score for user: ${userContext.userId}`,
    );

    const signals: FraudSignal[] = [];

    // 1. Account Age & Verification Signals
    signals.push(...this.checkAccountSignals(userContext));

    // 2. Behavioral Signals
    signals.push(...this.checkBehaviorSignals(userContext));

    // 3. Community Feedback Signals
    signals.push(...this.checkFeedbackSignals(userContext));

    // 4. Historical Enforcement Signals
    signals.push(...this.checkEnforcementHistory(userContext));

    // 5. Device & Network Signals
    signals.push(...this.checkDeviceNetworkSignals(userContext));

    // Calculate weighted final score
    const finalScore = this.calculateWeightedScore(signals);
    const riskLevel = this.determineRiskLevel(finalScore);

    // Determine if manual review is needed
    const requiresReview = this.shouldRequireReview(
      finalScore,
      signals,
      userContext,
    );

    const recommendation = this.generateRecommendation(
      finalScore,
      riskLevel,
      signals,
    );

    this.logger.log(
      `User ${userContext.userId} - Score: ${finalScore}, Risk: ${riskLevel}, Review: ${requiresReview}`,
    );

    return {
      userId: userContext.userId,
      finalScore,
      riskLevel,
      signals,
      recommendation,
      requiresReview,
    };
  }

  /**
   * Calculate fraud score for a specific ad listing
   */
  async calculateAdFraudScore(
    adContext: AdContext,
    userScore: number,
  ): Promise<FraudScoreResult> {
    this.logger.log(`Calculating fraud score for ad: ${adContext.adId}`);

    const signals: FraudSignal[] = [];

    // 1. Content + Image Duplication (merged)
    signals.push(...this.checkContentDuplication(adContext));

    // 2. Inherit user risk when above review threshold
    if (userScore >= 40) {
      signals.push({
        name: 'high_user_risk',
        score: Math.min(userScore, 100),
        weight: this.signalWeights.previousBans, // reuse highest weight
        evidence: { userScore },
      });
    }

    const finalScore = this.calculateWeightedScore(signals);
    const riskLevel = this.determineRiskLevel(finalScore);
    const requiresReview = finalScore >= 70; // Ads get manual review at lower threshold

    const recommendation = this.generateAdRecommendation(
      finalScore,
      riskLevel,
      signals,
    );

    return {
      userId: adContext.userId,
      finalScore,
      riskLevel,
      signals,
      recommendation,
      requiresReview,
    };
  }

  /**
   * =====================================================================
   * SIGNAL DETECTION FUNCTIONS
   * =====================================================================
   */

  /**
   * Check account-level signals (account age only)
   */
  private checkAccountSignals(context: UserContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // New account (< 7 days)
    if (context.accountAgeHours < 168) {
      const score = Math.max(0, 100 - (context.accountAgeHours / 168) * 100);
      signals.push({
        name: 'new_account',
        score,
        weight: this.signalWeights.newAccount,
        evidence: { accountAgeHours: context.accountAgeHours },
      });
    }

    return signals;
  }

  /**
   * Check behavioral signals (velocity / rapid posting)
   */
  private checkBehaviorSignals(context: UserContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Rapid posting in last 24 h (primary velocity signal)
    if (context.adsCreatedLast24h > 10) {
      const score = Math.min(100, (context.adsCreatedLast24h / 30) * 100);
      signals.push({
        name: 'rapid_posting',
        score,
        weight: this.signalWeights.rapidPosting,
        evidence: { adsCreatedLast24h: context.adsCreatedLast24h },
      });
    }

    return signals;
  }

  /**
   * Check community feedback signals
   */
  private checkFeedbackSignals(context: UserContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // User reports
    if (context.reportsReceived > 0) {
      const score = Math.min(100, (context.reportsReceived / 10) * 100);
      signals.push({
        name: 'user_reports',
        score,
        weight: this.signalWeights.highReports,
        evidence: { reportsReceived: context.reportsReceived },
      });
    }

    return signals;
  }

  /**
   * Check enforcement history signals
   * Warnings are included in ban count to keep a single signal.
   */
  private checkEnforcementHistory(context: UserContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Ban evasion (permanent ban on a prior account) – highest priority
    if (context.previousPermanentBans > 0) {
      signals.push({
        name: 'ban_evasion',
        score: 100,
        weight: this.signalWeights.previousBans,
        evidence: { previousPermanentBans: context.previousPermanentBans },
      });
      return signals; // No need to add more enforcement signals
    }

    // Previous temp bans or multiple warnings
    const enforcementCount = context.previousTempBans + Math.floor(context.previousWarnings / 2);
    if (enforcementCount > 0) {
      const score = Math.min(100, enforcementCount * 40);
      signals.push({
        name: 'enforcement_history',
        score,
        weight: this.signalWeights.previousBans,
        evidence: { previousTempBans: context.previousTempBans, previousWarnings: context.previousWarnings },
      });
    }

    return signals;
  }

  /**
   * Check device and network signals (device count + IP rate limit)
   */
  private checkDeviceNetworkSignals(context: UserContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Multiple devices (account sharing or bot farm)
    if (context.deviceCount > 3) {
      const score = Math.min(100, (context.deviceCount / 10) * 100);
      signals.push({
        name: 'device_sharing',
        score,
        weight: this.signalWeights.deviceSharing,
        evidence: { deviceCount: context.deviceCount },
      });
    }

    // Frequent IP changes (VPN / proxy abuse)
    if (context.ipChangesLast7d > 5) {
      const score = Math.min(100, (context.ipChangesLast7d / 20) * 100);
      signals.push({
        name: 'ip_rate',
        score,
        weight: this.signalWeights.ipShifting,
        evidence: { ipChangesLast7d: context.ipChangesLast7d },
      });
    }

    return signals;
  }

  /**
   * Check content + image duplication signals (merged)
   * In production: query fraud_content_patterns for both description hash and image hashes
   */
  private checkContentDuplication(adContext: AdContext): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Description duplicate check
    // Production: SELECT occurrence_count FROM fraud_content_patterns WHERE pattern_hash = ?
    const duplicateDescCount = 0; // Placeholder
    if (duplicateDescCount > 1) {
      const score = Math.min(100, (duplicateDescCount / 10) * 100);
      signals.push({
        name: 'duplicate_content',
        score,
        weight: this.signalWeights.duplicateContent,
        evidence: { descriptionHash: adContext.descriptionHash, duplicateDescCount },
      });
    }

    // Image duplicate check (merged - same signal, same weight)
    // Production: SELECT occurrence_count FROM fraud_content_patterns WHERE pattern_hash IN (imageHashes)
    const duplicateImageCount = 0; // Placeholder
    if (duplicateImageCount > 0 && duplicateDescCount === 0) {
      // Only add image signal if content signal not already firing (avoid double-counting)
      const score = Math.min(100, (duplicateImageCount / 5) * 100);
      signals.push({
        name: 'duplicate_images',
        score,
        weight: this.signalWeights.duplicateContent,
        evidence: { imageHashes: adContext.imagePerceptualHashes, duplicateImageCount },
      });
    }

    return signals;
  }

  /**
   * =====================================================================
   * SCORING CALCULATION
   * =====================================================================
   */

  /**
   * Simple additive scoring: score = sum(signal.score * weight / 100), capped at 100
   * No weighted normalization – signals are additive contributors.
   */
  private calculateWeightedScore(signals: FraudSignal[]): number {
    if (signals.length === 0) return 0;

    const total = signals.reduce(
      (sum, s) => sum + s.score * (s.weight / 100),
      0,
    );

    return Math.min(100, Math.round(total));
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(
    score: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= this.riskThresholds.low.max) return 'low';
    if (score <= this.riskThresholds.medium.max) return 'medium';
    if (score <= this.riskThresholds.high.max) return 'high';
    return 'critical';
  }

  /**
   * Determine if manual review is required
   */
  private shouldRequireReview(
    score: number,
    signals: FraudSignal[],
    context: UserContext,
  ): boolean {
    // Critical score always requires review
    if (score >= 80) return true;

    // Multiple high-weight signals
    const highWeightSignals = signals.filter((s) => s.weight >= 25);
    if (highWeightSignals.length >= 3) return true;

    // Previous bans with new violation
    if (context.previousTempBans > 0 && score >= 60) return true;

    // Multiple independent reports
    if (context.reportsReceived >= 3) return true;

    return false;
  }

  /**
   * =====================================================================
   * RECOMMENDATION GENERATION
   * =====================================================================
   */

  /**
   * Generate human-readable recommendation
   */
  private generateRecommendation(
    score: number,
    riskLevel: string,
    signals: FraudSignal[],
  ): string {
    const topSignals = signals
      .sort((a, b) => b.score * b.weight - a.score * a.weight)
      .slice(0, 3)
      .map((s) => s.name)
      .join(', ');

    switch (riskLevel) {
      case 'low':
        return 'No action required. Monitor behavior.';

      case 'medium':
        return `Show safety warnings to buyers. Monitor for: ${topSignals}`;

      case 'high':
        return `Reduce ad visibility, limit features. Queue for review. Risk factors: ${topSignals}`;

      case 'critical':
        return `Temporary suspension recommended. Mandatory manual review. Critical factors: ${topSignals}`;

      default:
        return 'Unknown risk level';
    }
  }

  /**
   * Generate ad-specific recommendation
   */
  private generateAdRecommendation(
    score: number,
    riskLevel: string,
    signals: FraudSignal[],
  ): string {
    const topSignals = signals
      .sort((a, b) => b.score * b.weight - a.score * a.weight)
      .slice(0, 2)
      .map((s) => s.name)
      .join(', ');

    switch (riskLevel) {
      case 'low':
        return 'Ad approved. Normal visibility.';

      case 'medium':
        return `Ad published with buyer warnings. Factors: ${topSignals}`;

      case 'high':
        return `Reduce ad visibility in search. Flag for review. Factors: ${topSignals}`;

      case 'critical':
        return `Hide ad pending review. Do not publish. Critical factors: ${topSignals}`;

      default:
        return 'Unknown risk level';
    }
  }

  /**
   * =====================================================================
   * SCORE DECAY (GOOD BEHAVIOR REWARDS)
   * =====================================================================
   */

  /**
   * Apply score decay for good behavior over time
   * Users who behave well should see their scores decrease
   */
  async applyScoreDecay(
    userId: string,
    currentScore: number,
    daysSinceLastViolation: number,
  ): Promise<number> {
    if (currentScore === 0) return 0;

    const decayRatePerDay = 2; // 2 points per day of good behavior
    const minDaysForDecay = 7; // Start decay after 7 days

    if (daysSinceLastViolation < minDaysForDecay) {
      return currentScore; // No decay yet
    }

    const decayAmount = (daysSinceLastViolation - minDaysForDecay) * decayRatePerDay;
    const newScore = Math.max(0, currentScore - decayAmount);

    this.logger.log(
      `Score decay for user ${userId}: ${currentScore} -> ${newScore} (${daysSinceLastViolation} days clean)`,
    );

    return newScore;
  }

  /**
   * =====================================================================
   * CONFIGURATION LOADING
   * =====================================================================
   */

  /**
   * Load signal weights from database configuration
   * Allows dynamic adjustment without code deployment
   */
  async loadConfigurationFromDatabase(): Promise<void> {
    try {
      // In production, load from fraud_config table
      // const config = await this.configRepository.findOne({
      //   where: { config_key: 'signal_weights' }
      // });
      //
      // if (config) {
      //   this.signalWeights = config.config_value;
      // }

      this.logger.log('Fraud scoring configuration loaded');
    } catch (error) {
      this.logger.error('Failed to load fraud configuration', error);
      // Fall back to default weights
    }
  }
}
