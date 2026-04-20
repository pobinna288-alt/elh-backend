# Billing, Idempotency, and Paystack Exact-Once Test Suite

## Purpose
This test suite validates distributed correctness for AI usage billing, quota enforcement, and Paystack webhook processing.

## Environment Requirements
- 1 shared Redis instance (required)
- 2 to 5 backend instances for multi-instance tests
- AI_IDEMPOTENCY_SECRET configured
- MARKET_INTERNAL_AUTH_SECRET configured
- PAYSTACK_SECRET_KEY configured
- Test user identities for all tiers: starter, pro, elite, enterprise, vip

## Common Redis Keys Under Test
- ai:guard:{userId}:{tier}:{feature}:req:{requestId}
- ai:guard:{userId}:{tier}:{feature}:lock:{requestId}
- ai:guard:usage:{userId}:{tier}
- ai:subscription:{userId}:tier
- ai:subscription:{userId}:state
- paystack:webhook:event:{eventId}:state
- paystack:webhook:event:{eventId}:lock

## Test 1: Double Execution Concurrency Test
Goal: same request 100 to 1000 times executes once.

1. Use one authenticated user and one feature endpoint, same payload.
2. Fire 100 to 1000 parallel POST requests within the same idempotency time window.
3. Assert one request reaches SUCCESS transition from EXECUTING.
4. Assert all others return replay response or in-progress conflict.
5. Assert exactly one final response payload is cached in request state hash.

Expected:
- Single successful execution path.
- No duplicate downstream engine side effects.

## Test 2: Double Billing Prevention Test
Goal: same request replay must not increment quota twice.

1. Send one successful request.
2. Replay the identical request 10 to 50 times.
3. Read ai:guard:usage:{userId}:{tier} fields for day/month/year.
4. Assert counters increment by exactly 1 for the feature execution.

Expected:
- Quota increments once only.
- Replays do not mutate usage counters.

## Test 3: Paystack Webhook Replay Test
Goal: same payment event updates subscription once.

1. Construct one valid signed charge.success webhook payload.
2. Deliver exact same payload 5 to 20 times in parallel.
3. Assert paystack:webhook:event:{eventId}:state transitions to SUCCESS once.
4. Assert ai:subscription:{userId}:tier and ai:subscription:{userId}:state reflect one canonical update.
5. Assert duplicate deliveries return idempotent success/in-progress responses.

Expected:
- One subscription update only.
- No duplicate upgrade side effects.

## Test 4: Multi-Server Safety Test
Goal: global correctness across 2 to 5 backend instances.

1. Start 2 to 5 backend instances using same Redis.
2. Route identical requests to different instances concurrently.
3. Route duplicate webhook retries to different instances concurrently.
4. Assert global single execution and single billing/subscription mutation.

Expected:
- Cross-instance exact-once behavior preserved.
- No split-brain state.

## Test 5: Crash Recovery Test
Goal: crash during in-flight state does not cause double billing.

1. Trigger request execution and crash/kill process during IN_PROGRESS or EXECUTING window.
2. Wait for lock TTL expiration.
3. Replay identical request.
4. Assert at most one SUCCESS billing commit exists.
5. Assert FAILED state remains retry-safe and does not duplicate quota.

Expected:
- Recovery does not create duplicate execution or billing.

## Test 6: Tier Isolation Test
Goal: strict tier boundaries, no leakage.

1. Run same feature matrix against users in starter, pro, elite, enterprise, vip.
2. Validate feature access and limit behavior from centralized policy only.
3. Confirm enterprise and vip use yearly-only enforcement.
4. Confirm starter, pro, elite enforce dual caps (daily/monthly).

Expected:
- No cross-tier feature or quota leakage.
- Enterprise and vip never evaluated by daily/monthly limits.

## Optional Extended Tests

### Replay Attack Test
1. Send webhook with invalid signature.
2. Send internal market call with invalid signature.
3. Send internal market call with expired timestamp.

Expected:
- All rejected before execution.

### Enterprise Contract Soft vs Hard Throttle
1. Configure enterprise hardThrottle=false and exceed yearly limit.
2. Assert alert mode without hard rejection.
3. Configure enterprise hardThrottle=true and exceed yearly limit.
4. Assert hard rejection.

Expected:
- Config-driven yearly contract behavior is correct.

## CI Gate Recommendation
Treat this suite as release-blocking for payment or AI enforcement changes.

Release rule:
- Any failure in Tests 1 to 6 blocks deployment.
