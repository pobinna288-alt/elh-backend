describe('subscription pricing config', () => {
    const envBackup = { ...process.env };
    afterEach(() => {
        process.env = { ...envBackup };
        jest.resetModules();
    });
    it('uses the new premium defaults for monthly billing', () => {
        delete process.env.PREMIUM_PRICE_USD;
        delete process.env.PREMIUM_PRICE_NGN;
        delete process.env.PREMIUM_COINS;
        delete process.env.PREMIUM_DURATION_DAYS;
        const { PREMIUM_PRICE_USD, PREMIUM_PRICE_NGN, PREMIUM_COINS, PREMIUM_DURATION_DAYS, getSubscriptionBilling, } = require('./subscription-pricing.config');
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
    });
    it('returns null for unsupported plans', () => {
        const { getSubscriptionBilling } = require('./subscription-pricing.config');
        expect(getSubscriptionBilling('unknown')).toBeNull();
    });
});
//# sourceMappingURL=subscription-pricing.config.spec.js.map