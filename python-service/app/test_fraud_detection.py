"""
Fraud Detection System - Testing Guide
Test cases for financial-grade fraud prevention when coins = real money
"""

import json
import time
from datetime import datetime, timedelta

# Test User Factory
class TestUserFactory:
    @staticmethod
    def create_legitimate_user():
        return {
            'user_id': 'user_legitimate_001',
            'account_age_hours': 720,  # 30 days
            'total_ads_watched': 50,
            'unique_devices': 1,
            'unique_ips': 1,
            'avg_watch_interval_ms': 180000,  # 3 min intervals
            'watch_interval_variance': 45000,  # High variance = human
            'vpn_usage_ratio': 0.0,
            'same_device_accounts': 1,
            'withdrawal_attempts': 5,
            'email_verified': True,
            'phone_verified': True,
            'social_engagement_score': 85,
            'time_since_last_ad_minutes': 15,
            'ads_last_hour': 1,
            'ads_last_24h': 15,
            'earnings_to_activity_ratio': 0.5,
            'total_earned_coins': 150,
            'identity_verified': True,
        }

    @staticmethod
    def create_bot_user():
        """User with obvious bot patterns"""
        return {
            'user_id': 'user_bot_001',
            'account_age_hours': 2,  # Brand new
            'total_ads_watched': 95,  # Too many for new account
            'unique_devices': 1,
            'unique_ips': 1,
            'avg_watch_interval_ms': 30500,  # ~30s = impossible
            'watch_interval_variance': 100,  # Perfect consistency = bot
            'vpn_usage_ratio': 0.0,
            'same_device_accounts': 1,
            'withdrawal_attempts': 0,
            'email_verified': False,
            'phone_verified': False,
            'social_engagement_score': 2,
            'time_since_last_ad_minutes': 0.5,
            'ads_last_hour': 12,
            'ads_last_24h': 95,
            'earnings_to_activity_ratio': 0.95,  # Earning nearly everything
            'total_earned_coins': 950,
            'identity_verified': False,
        }

    @staticmethod
    def create_device_farmer():
        """User farming coins across multiple devices"""
        return {
            'user_id': 'user_farmer_001',
            'account_age_hours': 360,  # 15 days
            'total_ads_watched': 150,
            'unique_devices': 8,  # Many devices
            'unique_ips': 6,
            'avg_watch_interval_ms': 120000,
            'watch_interval_variance': 15000,  # Still somewhat consistent
            'vpn_usage_ratio': 0.0,
            'same_device_accounts': 5,  # 5 accounts on same device
            'withdrawal_attempts': 8,
            'email_verified': True,
            'phone_verified': False,
            'social_engagement_score': 10,
            'time_since_last_ad_minutes': 2,
            'ads_last_hour': 4,
            'ads_last_24h': 28,
            'earnings_to_activity_ratio': 0.85,
            'total_earned_coins': 420,
            'identity_verified': False,
        }

    @staticmethod
    def create_vpn_hopper():
        """User using VPN to bypass restrictions"""
        return {
            'user_id': 'user_vpn_001',
            'account_age_hours': 48,
            'total_ads_watched': 65,
            'unique_devices': 2,
            'unique_ips': 22,  # Many IPs from VPN
            'avg_watch_interval_ms': 90000,
            'watch_interval_variance': 30000,
            'vpn_usage_ratio': 0.95,  # Almost always VPN
            'same_device_accounts': 1,
            'withdrawal_attempts': 3,
            'email_verified': True,
            'phone_verified': False,
            'social_engagement_score': 15,
            'time_since_last_ad_minutes': 5,
            'ads_last_hour': 3,
            'ads_last_24h': 60,
            'earnings_to_activity_ratio': 0.90,
            'total_earned_coins': 650,
            'identity_verified': False,
        }

    @staticmethod
    def create_edge_case_legitimate():
        """Legitimate user with some unusual patterns"""
        return {
            'user_id': 'user_edge_001',
            'account_age_hours': 72,  # 3 days
            'total_ads_watched': 45,  # Enthusiastic early adopter
            'unique_devices': 2,  # Legit reason (phone + tablet)
            'unique_ips': 2,  # Legit reason (home + work WiFi)
            'avg_watch_interval_ms': 150000,
            'watch_interval_variance': 60000,
            'vpn_usage_ratio': 0.0,
            'same_device_accounts': 1,
            'withdrawal_attempts': 2,
            'email_verified': True,
            'phone_verified': True,
            'social_engagement_score': 45,
            'time_since_last_ad_minutes': 8,
            'ads_last_hour': 2,
            'ads_last_24h': 22,
            'earnings_to_activity_ratio': 0.45,
            'total_earned_coins': 200,
            'identity_verified': False,
        }


class TestCases:
    """Fraud detection test cases"""

    def __init__(self, ml_service_url: str):
        self.base_url = ml_service_url
        self.results = []

    def test_legitimate_user_approved(self):
        """
        Test Case 1: Legitimate user should be approved
        Expected: APPROVE (score < 0.3)
        """
        user = TestUserFactory.create_legitimate_user()
        result = self.predict(user)

        assert result['action'] == 'APPROVE', f"Expected APPROVE, got {result['action']}"
        assert result['fraud_probability'] < 0.3, f"Score too high: {result['fraud_probability']}"

        self.results.append({
            'test': 'test_legitimate_user_approved',
            'status': 'PASSED',
            'score': result['fraud_probability'],
        })

    def test_obvious_bot_blocked(self):
        """
        Test Case 2: Obvious bot should be blocked
        Expected: BLOCK (score > 0.9)
        """
        user = TestUserFactory.create_bot_user()
        result = self.predict(user)

        assert result['action'] == 'BLOCK', f"Expected BLOCK, got {result['action']}"
        assert result['fraud_probability'] > 0.85, f"Score too low: {result['fraud_probability']}"
        assert 'new-account-rapid-activity' in result['rule_violations']
        assert 'impossible-watch-velocity' in result['rule_violations']

        self.results.append({
            'test': 'test_obvious_bot_blocked',
            'status': 'PASSED',
            'score': result['fraud_probability'],
            'violations': result['rule_violations'],
        })

    def test_device_farmer_flagged(self):
        """
        Test Case 3: Device farmer should be flagged for manual review
        Expected: MANUAL_REVIEW or EXTENDED_HOLD
        """
        user = TestUserFactory.create_device_farmer()
        result = self.predict(user)

        assert result['action'] in ['MANUAL_REVIEW', 'EXTENDED_HOLD'], \
            f"Expected MANUAL_REVIEW, got {result['action']}"
        assert result['fraud_probability'] >= 0.5
        assert 'device-farming' in result['rule_violations']

        self.results.append({
            'test': 'test_device_farmer_flagged',
            'status': 'PASSED',
            'score': result['fraud_probability'],
            'action': result['action'],
        })

    def test_vpn_hopper_extended_hold(self):
        """
        Test Case 4: VPN hopper should get extended hold
        Expected: EXTENDED_HOLD or MANUAL_REVIEW
        """
        user = TestUserFactory.create_vpn_hopper()
        result = self.predict(user)

        assert result['action'] in ['EXTENDED_HOLD', 'MANUAL_REVIEW']
        assert result['fraud_probability'] >= 0.45
        assert 'vpn-hopping' in result['rule_violations']

        self.results.append({
            'test': 'test_vpn_hopper_extended_hold',
            'status': 'PASSED',
            'score': result['fraud_probability'],
            'action': result['action'],
        })

    def test_edge_case_approved(self):
        """
        Test Case 5: Edge case legitimate user should still be approved
        Even though account is new, behavior is legitimate
        Expected: APPROVE or EXTENDED_HOLD (not blocked)
        """
        user = TestUserFactory.create_edge_case_legitimate()
        result = self.predict(user)

        assert result['action'] in ['APPROVE', 'EXTENDED_HOLD'], \
            f"Expected approval, got {result['action']}"
        # Should NOT block a legitimate enthusiastic user
        assert result['action'] != 'BLOCK'

        self.results.append({
            'test': 'test_edge_case_approved',
            'status': 'PASSED',
            'score': result['fraud_probability'],
            'action': result['action'],
        })

    def test_false_positive_rate(self):
        """
        Test Case 6: Measure false positive rate
        Generate 100 legitimate users and check < 1% false positives
        Expected: < 1% blocked
        """
        legitimate_users = [TestUserFactory.create_legitimate_user() for _ in range(100)]
        results = []

        for user in legitimate_users:
            result = self.predict(user)
            results.append(result)

        blocked_count = sum(1 for r in results if r['action'] == 'BLOCK')
        false_positive_rate = (blocked_count / len(results)) * 100

        assert false_positive_rate < 1.0, \
            f"False positive rate too high: {false_positive_rate}%"

        self.results.append({
            'test': 'test_false_positive_rate',
            'status': 'PASSED',
            'false_positive_rate': f"{false_positive_rate:.2f}%",
            'blocked_count': blocked_count,
        })

    def test_fraud_detection_rate(self):
        """
        Test Case 7: Measure fraud detection rate
        Generate 100 obvious bots and check > 95% are caught
        Expected: > 95% caught
        """
        fraudulent_users = [TestUserFactory.create_bot_user() for _ in range(100)]
        results = []

        for user in fraudulent_users:
            result = self.predict(user)
            results.append(result)

        caught_count = sum(1 for r in results if r['action'] in ['BLOCK', 'MANUAL_REVIEW'])
        detection_rate = (caught_count / len(results)) * 100

        assert detection_rate > 95, \
            f"Detection rate too low: {detection_rate}%"

        self.results.append({
            'test': 'test_fraud_detection_rate',
            'status': 'PASSED',
            'detection_rate': f"{detection_rate:.2f}%",
            'caught_count': caught_count,
        })

    def test_combined_fraud_patterns(self):
        """
        Test Case 8: Multiple fraud signals combined
        User with bot patterns + device farming + VPN + new account
        Expected: BLOCK (highest risk)
        """
        user = TestUserFactory.create_bot_user()
        user.update(TestUserFactory.create_device_farmer())  # Combine patterns
        user.update(TestUserFactory.create_vpn_hopper())

        result = self.predict(user)

        assert result['action'] == 'BLOCK', f"Expected BLOCK, got {result['action']}"
        assert result['fraud_probability'] > 0.9
        assert len(result['rule_violations']) > 3  # Multiple violations

        self.results.append({
            'test': 'test_combined_fraud_patterns',
            'status': 'PASSED',
            'score': result['fraud_probability'],
            'violations_count': len(result['rule_violations']),
        })

    def test_response_time(self):
        """
        Test Case 9: ML service response time
        Expected: < 500ms
        """
        user = TestUserFactory.create_legitimate_user()

        start_time = time.time()
        result = self.predict(user)
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < 500, f"Response too slow: {elapsed_ms}ms"

        self.results.append({
            'test': 'test_response_time',
            'status': 'PASSED',
            'response_time_ms': f"{elapsed_ms:.2f}ms",
        })

    def predict(self, user_data: dict) -> dict:
        """Call the ML service"""
        import requests
        response = requests.post(f"{self.base_url}/predict", json=user_data, timeout=5)
        return response.json()

    def run_all_tests(self) -> dict:
        """Run all test cases"""
        test_methods = [
            self.test_legitimate_user_approved,
            self.test_obvious_bot_blocked,
            self.test_device_farmer_flagged,
            self.test_vpn_hopper_extended_hold,
            self.test_edge_case_approved,
            self.test_false_positive_rate,
            self.test_fraud_detection_rate,
            self.test_combined_fraud_patterns,
            self.test_response_time,
        ]

        for test_method in test_methods:
            try:
                test_method()
                print(f"✓ {test_method.__name__}")
            except AssertionError as e:
                print(f"✗ {test_method.__name__}: {str(e)}")
                self.results[-1]['status'] = 'FAILED'
                self.results[-1]['error'] = str(e)

        return self.generate_report()

    def generate_report(self) -> dict:
        """Generate test report"""
        passed = sum(1 for r in self.results if r['status'] == 'PASSED')
        failed = sum(1 for r in self.results if r['status'] == 'FAILED')

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'total_tests': len(self.results),
            'passed': passed,
            'failed': failed,
            'pass_rate': f"{(passed / len(self.results) * 100):.1f}%",
            'details': self.results,
        }


if __name__ == '__main__':
    import sys

    ml_service_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'

    print("=" * 60)
    print("Fraud Detection System - Test Suite")
    print("=" * 60)

    tester = TestCases(ml_service_url)
    report = tester.run_all_tests()

    print("\n" + "=" * 60)
    print(f"Results: {report['passed']}/{report['total_tests']} tests passed ({report['pass_rate']})")
    print("=" * 60)

    if report['failed'] > 0:
        print("\nFailed Tests:")
        for result in report['details']:
            if result['status'] == 'FAILED':
                print(f"  - {result['test']}: {result.get('error', 'Unknown error')}")

    print("\nFull report saved to: fraud_test_report.json")
    with open('fraud_test_report.json', 'w') as f:
        json.dump(report, f, indent=2)
