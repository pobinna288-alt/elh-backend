# Marketplace Fraud Detection - Algorithm Pseudocode

This document contains human-readable pseudocode for all core fraud detection algorithms.

---

## 1. Fraud Scoring Algorithm

### 1.1 Calculate User Fraud Score

```python
function calculateUserFraudScore(userContext):
    # Initialize
    signals = []
    
    # 1. ACCOUNT SIGNALS (15-25 points)
    if userContext.accountAgeHours < 168:  # Less than 7 days
        score = max(0, 15 - (userContext.accountAgeHours / 168 * 15))
        signals.append({
            name: 'new_account',
            score: score,
            weight: 15,
            evidence: { accountAgeHours: userContext.accountAgeHours }
        })
    
    if not userContext.emailVerified:
        signals.append({
            name: 'unverified_email',
            score: 10,
            weight: 10
        })
    
    if not userContext.phoneVerified:
        signals.append({
            name: 'unverified_phone',
            score: 10,
            weight: 10
        })
    
    if not userContext.profileComplete:
        signals.append({
            name: 'incomplete_profile',
            score: 5,
            weight: 5
        })
    
    # 2. BEHAVIOR SIGNALS (20-40 points)
    if userContext.adsCreatedLast24h > 10:
        score = min(100, (userContext.adsCreatedLast24h / 30) * 100)
        signals.append({
            name: 'rapid_posting_24h',
            score: score,
            weight: 20
        })
    
    if userContext.adsCreatedLast7d > 50:
        score = min(100, (userContext.adsCreatedLast7d / 100) * 100)
        signals.append({
            name: 'rapid_posting_7d',
            score: score,
            weight: 20
        })
    
    if userContext.messagesLast1h > 20:
        score = min(100, (userContext.messagesLast1h / 50) * 100)
        signals.append({
            name: 'rapid_messaging',
            score: score,
            weight: 15
        })
    
    # 3. COMMUNITY FEEDBACK (30 points)
    if userContext.reportsReceived > 0:
        score = min(100, (userContext.reportsReceived / 10) * 100)
        signals.append({
            name: 'user_reports',
            score: score,
            weight: 30
        })
    
    # 4. ENFORCEMENT HISTORY (20-40 points)
    if userContext.previousWarnings > 0:
        score = min(100, userContext.previousWarnings * 25)
        signals.append({
            name: 'previous_warnings',
            score: score,
            weight: 20
        })
    
    if userContext.previousTempBans > 0:
        score = min(100, userContext.previousTempBans * 40)
        signals.append({
            name: 'previous_temp_bans',
            score: score,
            weight: 40
        })
    
    # Ban evasion - CRITICAL
    if userContext.previousPermanentBans > 0:
        signals.append({
            name: 'ban_evasion',
            score: 100,
            weight: 100  # Maximum priority
        })
    
    # 5. DEVICE & NETWORK SIGNALS (15-25 points)
    if userContext.deviceCount > 5:
        score = min(100, (userContext.deviceCount / 10) * 100)
        signals.append({
            name: 'device_sharing',
            score: score,
            weight: 20
        })
    
    if userContext.ipChangesLast7d > 10:
        score = min(100, (userContext.ipChangesLast7d / 20) * 100)
        signals.append({
            name: 'ip_shifting',
            score: score,
            weight: 15
        })
    
    if userContext.countryChangesLast7d > 3:
        score = min(100, (userContext.countryChangesLast7d / 5) * 100)
        signals.append({
            name: 'country_hopping',
            score: score,
            weight: 25
        })
    
    # CALCULATE FINAL WEIGHTED SCORE
    finalScore = calculateWeightedAverage(signals)
    
    # Determine risk level
    riskLevel = determineRiskLevel(finalScore)
    
    # Determine if manual review needed
    requiresReview = shouldRequireReview(finalScore, signals, userContext)
    
    return {
        userId: userContext.userId,
        finalScore: finalScore,  # 0-100
        riskLevel: riskLevel,    # 'low', 'medium', 'high', 'critical'
        signals: signals,
        requiresReview: requiresReview
    }
```

### 1.2 Calculate Weighted Average

```python
function calculateWeightedAverage(signals):
    if signals.length == 0:
        return 0
    
    totalWeightedScore = 0
    totalWeight = 0
    
    for each signal in signals:
        # Normalize weight (0-100 → 0-1)
        normalizedWeight = signal.weight / 100
        
        # Add weighted contribution
        totalWeightedScore += signal.score * normalizedWeight
        totalWeight += normalizedWeight
    
    # Calculate final score
    if totalWeight > 0:
        finalScore = totalWeightedScore / totalWeight
    else:
        finalScore = 0
    
    # Cap at 100, round to integer
    return min(100, round(finalScore))
```

### 1.3 Determine Risk Level

```python
function determineRiskLevel(score):
    if score <= 30:
        return 'low'
    else if score <= 60:
        return 'medium'
    else if score <= 80:
        return 'high'
    else:
        return 'critical'
```

### 1.4 Should Require Manual Review

```python
function shouldRequireReview(score, signals, userContext):
    # Critical score always requires review
    if score >= 80:
        return true
    
    # Count high-weight signals (weight >= 25)
    highWeightSignals = signals.filter(s => s.weight >= 25)
    if highWeightSignals.length >= 3:
        return true
    
    # Previous bans with new high score
    if userContext.previousTempBans > 0 AND score >= 60:
        return true
    
    # Multiple independent reports
    if userContext.reportsReceived >= 3:
        return true
    
    return false
```

---

## 2. Decision Engine Algorithm

### 2.1 Make Enforcement Decision

```python
function makeEnforcementDecision(userContext):
    # Check for existing active restrictions
    if userContext.activeRestrictions.length > 0:
        return handleExistingRestrictions(userContext)
    
    # Route based on risk level
    switch userContext.riskLevel:
        case 'low':
            return handleLowRisk(userContext)
        
        case 'medium':
            return handleMediumRisk(userContext)
        
        case 'high':
            return handleHighRisk(userContext)
        
        case 'critical':
            return handleCriticalRisk(userContext)
        
        default:
            return {
                action: 'none',
                reason: 'Unknown risk level'
            }
```

### 2.2 Handle Low Risk (0-30)

```python
function handleLowRisk(userContext):
    return {
        action: 'none',
        level: null,
        reason: 'Low fraud risk. Continue monitoring.',
        requiresManualReview: false,
        notifyUser: false
    }
```

### 2.3 Handle Medium Risk (31-60)

```python
function handleMediumRisk(userContext):
    # Escalate if repeat offender
    if userContext.previousWarnings >= 2:
        return handleHighRisk(userContext)
    
    # Show buyer warnings, but don't punish seller
    return {
        action: 'none',  # No seller punishment
        level: null,
        reason: 'Medium risk detected. Showing buyer safety warnings.',
        restrictions: {
            buyerWarningEnabled: true,
            canPost: true,
            canMessage: true,
            adsHidden: false,
            reducedVisibility: false
        },
        requiresManualReview: false,
        notifyUser: false  # Don't tip off seller
    }
```

### 2.4 Handle High Risk (61-80) - Level 1

```python
function handleHighRisk(userContext):
    # Escalate to Level 2 if has previous temp bans
    if userContext.previousTempBans > 0:
        return escalateToLevel2(userContext)
    
    # Require review if multiple reports
    if userContext.reportsReceived >= 3:
        return {
            action: 'review_required',
            level: 1,
            reason: 'High risk with multiple reports. Manual review required.',
            restrictions: {
                canPost: true,
                canMessage: true,
                reducedVisibility: true
            },
            requiresManualReview: true,
            notifyUser: false
        }
    
    # Apply Level 1: Soft Restriction
    return {
        action: 'soft_restriction',
        level: 1,
        reason: 'High fraud risk. Applying soft restrictions.',
        restrictions: {
            canPost: true,
            canMessage: true,
            adsHidden: false,
            reducedVisibility: true,
            requireVerification: true
        },
        requiresManualReview: true,
        notifyUser: true
    }
```

### 2.5 Handle Critical Risk (81-100) - Level 2 or 3

```python
function handleCriticalRisk(userContext):
    # Check if meets permanent ban criteria
    if userContext.previousTempBans >= 2:
        return escalateToLevel3(userContext)
    
    # Apply Level 2: Temporary Ban
    return escalateToLevel2(userContext)
```

### 2.6 Escalate to Level 2 (Temporary Ban)

```python
function escalateToLevel2(userContext):
    # Calculate ban duration
    durationHours = calculateTempBanDuration(userContext)
    
    return {
        action: 'temp_ban',
        level: 2,
        reason: 'Critical fraud risk. Temporary suspension applied.',
        restrictions: {
            canPost: false,
            canMessage: false,
            adsHidden: true,
            reducedVisibility: true
        },
        durationHours: durationHours,
        requiresManualReview: true,  # MANDATORY
        notifyUser: true
    }
```

### 2.7 Calculate Temp Ban Duration

```python
function calculateTempBanDuration(userContext):
    # Base duration: 24 hours
    duration = 24
    
    # Add 24 hours for each previous temp ban
    duration += userContext.previousTempBans * 24
    
    # Cap at 72 hours
    duration = min(72, duration)
    
    # If score is extremely high (85+), use max duration
    if userContext.currentScore >= 85:
        duration = 72
    
    return duration
```

### 2.8 Escalate to Level 3 (Permanent Ban Candidate)

```python
function escalateToLevel3(userContext):
    # CRITICAL CHECK: Must meet ALL permanent ban criteria
    if not checkPermanentBanCriteria(userContext):
        # Criteria not met - fall back to Level 2
        return escalateToLevel2(userContext)
    
    # ALL criteria met - queue for MANDATORY human review
    return {
        action: 'review_required',
        level: 3,
        reason: 'User meets permanent ban criteria. URGENT manual review required.',
        restrictions: {
            canPost: false,
            canMessage: false,
            adsHidden: true,
            reducedVisibility: true
        },
        durationHours: 72,  # Suspended while under review
        requiresManualReview: true,  # CRITICAL: Human decision required
        permanentBanCandidate: true,
        evidence: {
            score: userContext.currentScore,
            previousWarnings: userContext.previousWarnings,
            previousTempBans: userContext.previousTempBans,
            reportsReceived: userContext.reportsReceived,
            requiresAdminApproval: true
        }
    }
```

### 2.9 Check Permanent Ban Criteria

```python
function checkPermanentBanCriteria(userContext):
    # ALL criteria must be true
    criteria = {
        highScoreOverTime: userContext.currentScore >= 85,
        multipleReports: userContext.reportsReceived >= 3,
        previousWarnings: userContext.previousWarnings >= 2,
        previousTempBans: userContext.previousTempBans >= 2,
        recentActivity: userContext.daysSinceLastViolation <= 30
    }
    
    # Check if ALL are true
    for key, value in criteria:
        if not value:
            return false  # One criterion failed
    
    # All criteria met
    log.warn('User meets ALL permanent ban criteria - flagging for urgent review')
    return true
```

---

## 3. Score Decay Algorithm

### 3.1 Apply Score Decay (Good Behavior Rewards)

```python
function applyScoreDecay(userId, currentScore, daysSinceLastViolation):
    # No decay needed if score is already 0
    if currentScore == 0:
        return 0
    
    # Configuration
    decayRatePerDay = 2       # Points to reduce per day
    minDaysForDecay = 7       # Grace period before decay starts
    
    # No decay during grace period
    if daysSinceLastViolation < minDaysForDecay:
        return currentScore
    
    # Calculate decay amount
    eligibleDays = daysSinceLastViolation - minDaysForDecay
    decayAmount = eligibleDays * decayRatePerDay
    
    # Apply decay (can't go below 0)
    newScore = max(0, currentScore - decayAmount)
    
    log('Score decay for user ' + userId + ': ' + 
        currentScore + ' → ' + newScore + 
        ' (' + daysSinceLastViolation + ' days clean)')
    
    return newScore
```

**Example Timeline**:
```
Day 0:  Score = 75 (violation occurred)
Day 7:  Score = 75 (grace period)
Day 8:  Score = 73 (decay starts: -2 pts)
Day 10: Score = 69 (-6 pts total)
Day 20: Score = 49 (-26 pts total)
Day 45: Score = 0  (fully recovered)
```

---

## 4. Pattern Detection Algorithms

### 4.1 Detect Multi-Account Fraud (Device Sharing)

```python
function detectMultiAccountFraud():
    # Find devices with many users
    suspiciousDevices = query(
        'SELECT device_hash, associated_user_ids, user_count ' +
        'FROM fraud_device_fingerprints ' +
        'WHERE user_count > 5 ' +
        'ORDER BY user_count DESC'
    )
    
    for each device in suspiciousDevices:
        users = device.associated_user_ids
        
        # Check if users have similar behavior patterns
        similarityScore = calculateSimilarity(users)
        
        if similarityScore > 0.7:  # 70% similarity threshold
            # Likely fraud ring
            for each userId in users:
                flagUser(userId, 'multi_account_fraud', {
                    deviceHash: device.device_hash,
                    accountCount: device.user_count,
                    similarity: similarityScore
                })
                
                addToReviewQueue(userId, priority: 'high')
```

### 4.2 Calculate User Similarity

```python
function calculateSimilarity(userIds):
    users = getUserData(userIds)
    
    # Compare multiple dimensions
    dimensions = {
        'sameCategory': 0,      # Same ad categories
        'similarPrices': 0,     # Similar price ranges
        'sameLocation': 0,      # Same location
        'samePostingTime': 0,   # Post at similar times
        'duplicateContent': 0   # Use same descriptions
    }
    
    # Calculate similarity for each dimension
    for each dimension:
        score = compareDimension(users, dimension)
        dimensions[dimension] = score
    
    # Average similarity across all dimensions
    totalSimilarity = sum(dimensions.values()) / dimensions.length
    
    return totalSimilarity
```

### 4.3 Detect Content Duplication

```python
function detectContentDuplication():
    # Find content patterns used multiple times
    duplicatePatterns = query(
        'SELECT pattern_hash, pattern_type, occurrence_count, user_ids, ad_ids ' +
        'FROM fraud_content_patterns ' +
        'WHERE occurrence_count > 3 ' +  # Used by more than 3 ads
        'ORDER BY occurrence_count DESC'
    )
    
    for each pattern in duplicatePatterns:
        # Check if different users are using same content
        uniqueUsers = getUniqueCount(pattern.user_ids)
        
        if uniqueUsers > 1:
            # Same content across multiple users - fraud ring
            for each userId in pattern.user_ids:
                flagUser(userId, 'content_duplication', {
                    patternType: pattern.pattern_type,
                    duplicateCount: pattern.occurrence_count,
                    affectedUsers: uniqueUsers
                })
                
                addToReviewQueue(userId, priority: 'medium')
```

### 4.4 Detect Image Reuse (Stolen Product Photos)

```python
function detectImageReuse():
    # Find image hashes used multiple times
    duplicateImages = query(
        'SELECT pattern_hash, user_ids, ad_ids, occurrence_count ' +
        'FROM fraud_content_patterns ' +
        'WHERE pattern_type = "image_perceptual_hash" ' +
        'AND occurrence_count > 2 ' +  # Same image in 3+ ads
        'ORDER BY occurrence_count DESC'
    )
    
    for each image in duplicateImages:
        uniqueUsers = getUniqueCount(image.user_ids)
        
        if uniqueUsers > 1:
            # Same image used by different users - likely stolen
            for each userId in image.user_ids:
                # Check if this user is the original poster
                oldestAd = getOldestAd(image.ad_ids)
                
                if userId != oldestAd.userId:
                    # This user reused someone else's image
                    flagUser(userId, 'image_theft', {
                        imageHash: image.pattern_hash,
                        originalAd: oldestAd.id,
                        originalUser: oldestAd.userId
                    })
                    
                    addToReviewQueue(userId, priority: 'high')
```

---

## 5. Off-Platform Contact Detection

### 5.1 Detect Off-Platform Patterns (Privacy-Safe)

```python
function detectOffPlatformPatterns(messageText):
    patterns = []
    
    # Phone number patterns
    phoneRegex = /\b\d{10,15}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/
    if phoneRegex.test(messageText):
        patterns.append('phone_number')
    
    # Email patterns
    emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    if emailRegex.test(messageText):
        patterns.append('email')
    
    # WhatsApp mentions
    whatsappRegex = /whatsapp|wa\.me|chat me on/i
    if whatsappRegex.test(messageText):
        patterns.append('whatsapp_mention')
    
    # Telegram mentions
    telegramRegex = /telegram|t\.me/i
    if telegramRegex.test(messageText):
        patterns.append('telegram_mention')
    
    # Generic off-platform requests
    externalRegex = /contact me (outside|off|directly)|call me|text me/i
    if externalRegex.test(messageText):
        patterns.append('external_contact_request')
    
    # CRITICAL: Return ONLY pattern flags, NOT message content
    return patterns
```

**IMPORTANT**: This function runs on the backend only. Message content is NEVER stored, only the pattern flags.

---

## 6. Admin Review Priority Algorithm

### 6.1 Calculate Review Priority

```python
function calculateReviewPriority(userContext):
    # Start with base priority
    priority = 'low'
    
    # URGENT: Permanent ban candidates
    if checkPermanentBanCriteria(userContext):
        return 'urgent'
    
    # HIGH: Critical score or repeat offenders
    if userContext.currentScore >= 80:
        return 'high'
    
    if userContext.previousTempBans >= 2:
        return 'high'
    
    # HIGH: Multiple independent reports
    if userContext.reportsReceived >= 5:
        return 'high'
    
    # MEDIUM: High score or moderate reports
    if userContext.currentScore >= 60:
        return 'medium'
    
    if userContext.reportsReceived >= 3:
        return 'medium'
    
    # LOW: Everything else
    return 'low'
```

### 6.2 Escalate Stale Reviews

```python
function escalateStaleReviews():
    # Find reviews waiting too long
    staleReviews = query(
        'SELECT id, user_id, priority, created_at ' +
        'FROM fraud_review_queue ' +
        'WHERE status = "pending" ' +
        'AND created_at < NOW() - INTERVAL 24 HOURS'
    )
    
    for each review in staleReviews:
        hoursWaiting = calculateHours(review.created_at, now())
        
        # Escalate priority
        newPriority = review.priority
        
        if hoursWaiting > 48:
            newPriority = 'urgent'
        else if hoursWaiting > 24:
            if review.priority == 'low':
                newPriority = 'medium'
            else if review.priority == 'medium':
                newPriority = 'high'
        
        # Update priority
        if newPriority != review.priority:
            update('fraud_review_queue', {
                id: review.id,
                priority: newPriority
            })
            
            # Notify admin team
            sendAlert('Review ' + review.id + ' escalated to ' + newPriority)
```

---

## 7. Event Archival Algorithm

### 7.1 Archive Old Events

```python
function archiveOldEvents():
    retentionDays = 90
    cutoffDate = now() - retentionDays * 24 * 60 * 60
    
    # Tables to archive
    tables = [
        'fraud_user_events',
        'fraud_ad_events',
        'fraud_messaging_events',
        'fraud_feedback_events'
    ]
    
    totalArchived = 0
    
    for each table in tables:
        # Move old events to archive table
        archivedCount = query(
            'INSERT INTO ' + table + '_archive ' +
            'SELECT * FROM ' + table + ' ' +
            'WHERE created_at < ?',
            [cutoffDate]
        )
        
        # Delete from main table
        query(
            'DELETE FROM ' + table + ' ' +
            'WHERE created_at < ?',
            [cutoffDate]
        )
        
        totalArchived += archivedCount
        log('Archived ' + archivedCount + ' rows from ' + table)
    
    # NEVER archive fraud_audit_logs (keep forever for compliance)
    
    log('Total events archived: ' + totalArchived)
    return totalArchived
```

---

## 8. Fraud Spike Detection

### 8.1 Monitor Fraud Spike

```python
function monitorFraudSpike():
    # Get current hour's high-risk user count
    currentHourHighRisk = query(
        'SELECT COUNT(*) FROM fraud_user_scores ' +
        'WHERE risk_level IN ("high", "critical") ' +
        'AND last_calculated_at > NOW() - INTERVAL 1 HOUR'
    )
    
    # Get historical average (last 7 days, same hour)
    averageHighRisk = query(
        'SELECT AVG(count) FROM (' +
        '  SELECT COUNT(*) as count ' +
        '  FROM fraud_score_history ' +
        '  WHERE risk_level IN ("high", "critical") ' +
        '  AND HOUR(created_at) = HOUR(NOW()) ' +
        '  AND created_at > NOW() - INTERVAL 7 DAYS ' +
        '  GROUP BY DATE(created_at)' +
        ')'
    )
    
    # Check for spike (2x average)
    if currentHourHighRisk > averageHighRisk * 2:
        sendAlert('FRAUD SPIKE DETECTED', {
            currentHour: currentHourHighRisk,
            average: averageHighRisk,
            ratio: currentHourHighRisk / averageHighRisk
        })
        
        # Temporarily increase thresholds to prevent false positives
        temporarilyIncreaseThresholds(duration: '2 hours')
    
    return {
        currentHour: currentHourHighRisk,
        average: averageHighRisk,
        spikeDetected: currentHourHighRisk > averageHighRisk * 2
    }
```

---

## 9. Safety Validation

### 9.1 Validate Decision Safety

```python
function validateDecisionSafety(decision):
    # CRITICAL: Never allow permanent ban without manual review
    if decision.level == 3 AND decision.action == 'temp_ban':
        if not decision.requiresManualReview:
            log.error('SAFETY VIOLATION: Level 3 action without manual review')
            return false
    
    # Ensure temp bans have duration
    if decision.action == 'temp_ban' AND not decision.durationHours:
        log.error('SAFETY VIOLATION: Temp ban without duration')
        return false
    
    # Ensure permanent bans have detailed reason
    if decision.action == 'permanent_ban':
        if not decision.reason OR decision.reason.length < 50:
            log.error('SAFETY VIOLATION: Permanent ban without detailed reason')
            return false
    
    return true
```

---

## 10. Performance Optimization

### 10.1 Batch Score Calculation

```python
function batchCalculateScores(userIds):
    # Instead of calculating one at a time:
    # for userId in userIds:
    #     calculateUserFraudScore(userId)
    
    # Batch fetch all user contexts in one query
    contexts = batchFetchUserContexts(userIds)
    
    # Calculate scores in parallel
    results = parallelMap(contexts, context => {
        return calculateUserFraudScore(context)
    })
    
    # Batch insert all scores in one transaction
    batchInsertScores(results)
    
    return results
```

### 10.2 Cache Frequently Accessed Data

```python
function getCachedUserScore(userId):
    # Check Redis cache first
    cacheKey = 'fraud:score:' + userId
    cachedScore = redis.get(cacheKey)
    
    if cachedScore:
        return JSON.parse(cachedScore)
    
    # Not in cache - calculate
    score = calculateUserFraudScore(getUserContext(userId))
    
    # Cache for 1 hour
    redis.setex(cacheKey, 3600, JSON.stringify(score))
    
    return score
```

---

**Version**: 1.0.0  
**Last Updated**: January 16, 2026  
**Status**: Production-ready algorithms
