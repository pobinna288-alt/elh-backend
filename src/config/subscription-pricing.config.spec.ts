describe('subscription pricing config', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    jest.resetModules();
  });

  it('uses the new starter, pro, and elite defaults for monthly billing', () => {
    delete process.env.PREMIUM_PRICE_USD;
    delete process.env.PREMIUM_PRICE_NGN;
    delete process.env.PREMIUM_COINS;
    delete process.env.PREMIUM_DURATION_DAYS;
    delete process.env.PRO_PRICE_USD;
    delete process.env.PRO_PRICE_NGN;
    delete process.env.PRO_COINS;
    delete process.env.PRO_DURATION_DAYS;
    delete process.env.HOT_PRICE_USD;
    delete process.env.HOT_PRICE_NGN;
    delete process.env.HOT_COINS;
    delete process.env.HOT_DURATION_DAYS;

    const {
      PREMIUM_PRICE_USD,
      PREMIUM_PRICE_NGN,
      PREMIUM_COINS,
      PREMIUM_DURATION_DAYS,
      getSubscriptionBilling,
      getSubscriptionPlanRules,
    } = require('./subscription-pricing.config');

    expect(PREMIUM_PRICE_USD).toBe(20);
    expect(PREMIUM_PRICE_NGN).toBe(15000);
    expect(PREMIUM_COINS).toBe(20000);
    expect(PREMIUM_DURATION_DAYS).toBe(30);

    expect(getSubscriptionBilling('premium')).toMatchObject({
      priceUsd: 20,
      paystackAmountNgn: 15000,
      coins: 20000,
      durationDays: 30,
    });

    expect(getSubscriptionBilling('pro')).toMatchObject({
      priceUsd: 60,
      paystackAmountNgn: 45000,
      coins: 60000,
      durationDays: 30,
    });

    expect(getSubscriptionBilling('hot')).toMatchObject({
      priceUsd: 120,
      paystackAmountNgn: 90000,
      coins: 120000,
      durationDays: 30,
    });

    expect(getSubscriptionPlanRules('starter')).toMatchObject({
      publicName: 'starter',
      maxFileSizeMb: 20,
      maxAdReach: 10000,
      aiRequestsPerToolPerDay: 10,
      coinsPerVideo: 2,
      maxCoinsPerDay: 50,
    });

    expect(getSubscriptionPlanRules('elite')).toMatchObject({
      publicName: 'elite',
      maxFileSizeMb: 50,
      maxAdReach: 1000000,
      aiRequestsPerToolPerDay: 30,
      coinsPerVideo: 5,
      maxCoinsPerDay: 225,
    });
  });

  it('returns null for unsupported plans', () => {
    const { getSubscriptionBilling, getSubscriptionPlanRules } = require('./subscription-pricing.config');
    expect(getSubscriptionBilling('unknown')).toBeNull();
    expect(getSubscriptionPlanRules('unknown')).toBeNull();
  });
});
