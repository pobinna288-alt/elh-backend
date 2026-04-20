"""
Machine Learning-based Fraud Detection for Rewarded Video System
When coins = real money, use ML to catch sophisticated fraud patterns
"""

from flask import Flask, request, jsonify
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
import joblib
import logging
from datetime import datetime, timedelta
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# SHADOW MODE – ML predictions are logged for analysis ONLY.
# They do NOT affect live enforcement decisions.
# Set to False once model accuracy is validated in production.
# ============================================================
SHADOW_MODE = True

# Load or train model
try:
    fraud_model = joblib.load('fraud_model.pkl')
    scaler = joblib.load('scaler.pkl')
except:
    logger.warning("Model files not found, using dummy model")
    fraud_model = None
    scaler = StandardScaler()


class FraudDetector:
    """High-stakes fraud detection with multiple signals"""
    
    # Risk thresholds
    CRITICAL_THRESHOLD = 0.9    # Immediate ban
    HIGH_THRESHOLD = 0.7        # Manual review
    MEDIUM_THRESHOLD = 0.5      # Extended hold
    LOW_THRESHOLD = 0.3         # Normal flow
    
    # Feature weights for explainability
    FEATURE_WEIGHTS = {
        'account_age_hours': 0.08,
        'total_ads_watched': 0.07,
        'unique_devices': 0.10,
        'unique_ips': 0.12,
        'avg_watch_interval_ms': 0.09,
        'watch_interval_variance': 0.11,
        'vpn_usage_ratio': 0.10,
        'same_device_accounts': 0.12,
        'withdrawal_attempts': 0.08,
        'email_verified': 0.05,
        'phone_verified': 0.03,
        'social_engagement_score': 0.06,
        'time_since_last_ad_minutes': 0.05,
        'ads_last_hour': 0.09,
        'ads_last_24h': 0.10,
        'earnings_to_activity_ratio': 0.10,
    }
    
    @staticmethod
    def extract_features(user_data: dict) -> np.ndarray:
        """Extract ML features from user data"""
        features = [
            user_data.get('account_age_hours', 0),
            user_data.get('total_ads_watched', 0),
            user_data.get('unique_devices', 0),
            user_data.get('unique_ips', 0),
            user_data.get('avg_watch_interval_ms', 0),
            user_data.get('watch_interval_variance', 0),
            user_data.get('vpn_usage_ratio', 0),
            user_data.get('same_device_accounts', 0),
            user_data.get('withdrawal_attempts', 0),
            1 if user_data.get('email_verified') else 0,
            1 if user_data.get('phone_verified') else 0,
            user_data.get('social_engagement_score', 0),
            user_data.get('time_since_last_ad_minutes', 0),
            user_data.get('ads_last_hour', 0),
            user_data.get('ads_last_24h', 0),
            user_data.get('earnings_to_activity_ratio', 0),
        ]
        
        return np.array(features).reshape(1, -1)
    
    @staticmethod
    def manual_fraud_rules(user_data: dict) -> dict:
        """
        Rule-based fraud detection for obvious cases
        These are heuristic-based patterns that catch clear abuse
        """
        signals = []
        score_adjustment = 0
        
        # Rule 1: Brand new account + high activity
        account_age = user_data.get('account_age_hours', 0)
        ads_watched = user_data.get('total_ads_watched', 0)
        
        if account_age < 1 and ads_watched > 20:
            signals.append('new-account-rapid-activity')
            score_adjustment += 0.25
        
        # Rule 2: Impossible watch intervals (< 30 seconds between ads)
        avg_interval = user_data.get('avg_watch_interval_ms', 0)
        if avg_interval > 0 and avg_interval < 30000:
            signals.append('impossible-watch-velocity')
            score_adjustment += 0.30
        
        # Rule 3: Zero variance in watch intervals (bot pattern)
        variance = user_data.get('watch_interval_variance', 0)
        ads_count = user_data.get('total_ads_watched', 0)
        if ads_count > 5 and variance < 1000:  # ms
            signals.append('perfect-consistency-bot')
            score_adjustment += 0.35
        
        # Rule 4: High withdrawal rate before verification
        if not user_data.get('identity_verified') and user_data.get('withdrawal_attempts', 0) > 3:
            signals.append('withdrawal-before-verification')
            score_adjustment += 0.20
        
        # Rule 5: Multiple accounts from same device
        same_device_count = user_data.get('same_device_accounts', 0)
        if same_device_count > 3:
            signals.append('device-farming')
            score_adjustment += 0.40
        
        # Rule 6: Too many IPs (VPN hopping)
        unique_ips = user_data.get('unique_ips', 0)
        if unique_ips > 15:
            signals.append('vpn-hopping')
            score_adjustment += 0.25
        
        # Rule 7: VPN usage without verification
        vpn_ratio = user_data.get('vpn_usage_ratio', 0)
        if vpn_ratio > 0.8 and not user_data.get('phone_verified'):
            signals.append('vpn-unverified')
            score_adjustment += 0.20
        
        # Rule 8: 24-hour binge watching
        ads_24h = user_data.get('ads_last_24h', 0)
        if ads_24h >= 30:
            signals.append('binge-watching-limit')
            score_adjustment += 0.35
        
        # Rule 9: Earnings with no engagement
        social_score = user_data.get('social_engagement_score', 0)
        total_earned = user_data.get('total_earned_coins', 0)
        if social_score < 5 and total_earned > 100:
            signals.append('earnings-without-engagement')
            score_adjustment += 0.22
        
        # Rule 10: Immediate withdrawal requests
        time_since_last_ad = user_data.get('time_since_last_ad_minutes', 0)
        if time_since_last_ad < 5 and user_data.get('withdrawal_attempts', 0) > 0:
            signals.append('immediate-cashout')
            score_adjustment += 0.28
        
        return {
            'signals': signals,
            'score_adjustment': min(score_adjustment, 0.5),  # Cap adjustment
            'has_violations': len(signals) > 0
        }
    
    def predict(self, user_data: dict) -> dict:
        """
        Predict fraud probability.
        In SHADOW_MODE the ML score is metadata only – the live decision
        comes from rule-based signals alone.
        """
        # Always run rule-based detection first (this IS the live decision)
        rule_result = self.manual_fraud_rules(user_data)
        rules_action = self._determine_action(rule_result['score_adjustment'])
        rules_reason = self._get_reason(rule_result['score_adjustment'], rule_result)

        # ML prediction (shadow – does not affect live decision)
        ml_probability = None
        if fraud_model:
            try:
                features = self.extract_features(user_data)
                features_scaled = scaler.transform(features)
                ml_probability = float(fraud_model.predict_proba(features_scaled)[0][1])
            except Exception as e:
                logger.warning(f"ML prediction skipped (shadow): {e}")

        if SHADOW_MODE:
            logger.info(
                f"[SHADOW] ml_score={ml_probability:.3f if ml_probability is not None else 'N/A'} "
                f"rules_action={rules_action}"
            )
            return {
                # Live decision – rules only
                'fraud_probability': float(rule_result['score_adjustment']),
                'rule_violations': rule_result['signals'],
                'action': rules_action,
                'reason': rules_reason,
                'holding_period_hours': self._get_holding_period(rules_action),
                'requires_verification': self._requires_verification(
                    rule_result['score_adjustment'], user_data
                ),
                'recommendation': self._get_recommendation(rule_result['score_adjustment']),
                # Shadow ML analytics (not used for enforcement)
                'shadow_prediction': {
                    'ml_probability': ml_probability,
                    'note': 'Shadow mode – for analysis only, not enforced',
                },
            }

        # Production mode (shadow disabled): combine ML + rules
        combined_score = (
            (ml_probability or 0.5) * 0.7 + rule_result['score_adjustment'] * 0.3
        )
        combined_score = min(combined_score, 1.0)
        action = self._determine_action(combined_score)
        reason = self._get_reason(combined_score, rule_result)

        logger.info(f"Fraud prediction: {action} (score: {combined_score:.2f})")

        return {
            'fraud_probability': float(combined_score),
            'ml_probability': ml_probability,
            'rule_violations': rule_result['signals'],
            'action': action,
            'reason': reason,
            'holding_period_hours': self._get_holding_period(action),
            'requires_verification': self._requires_verification(combined_score, user_data),
            'recommendation': self._get_recommendation(combined_score),
            'shadow_prediction': None,
        }
    
    def _determine_action(self, score: float) -> str:
        """Determine action based on fraud score"""
        if score >= self.CRITICAL_THRESHOLD:
            return 'BLOCK'
        elif score >= self.HIGH_THRESHOLD:
            return 'MANUAL_REVIEW'
        elif score >= self.MEDIUM_THRESHOLD:
            return 'EXTENDED_HOLD'
        else:
            return 'APPROVE'
    
    def _get_reason(self, score: float, rule_result: dict) -> str:
        """Get human-readable reason for action"""
        if score >= self.CRITICAL_THRESHOLD:
            return 'Critical fraud signals detected'
        elif score >= self.HIGH_THRESHOLD:
            return f'Multiple risk factors: {", ".join(rule_result["signals"][:3])}'
        elif score >= self.MEDIUM_THRESHOLD:
            return 'Elevated risk - extended holding period'
        else:
            return 'Low risk - normal processing'
    
    def _get_holding_period(self, action: str) -> int:
        """Get holding period in hours"""
        return {
            'BLOCK': 0,
            'MANUAL_REVIEW': 72,
            'EXTENDED_HOLD': 48,
            'APPROVE': 24,
        }.get(action, 24)
    
    def _requires_verification(self, score: float, user_data: dict) -> bool:
        """Check if additional verification is required"""
        if score > self.HIGH_THRESHOLD:
            return True
        
        total_earned = user_data.get('total_earned_coins', 0)
        if total_earned > 100 and not user_data.get('identity_verified'):
            return True
        
        return False
    
    def _get_recommendation(self, score: float) -> str:
        """Get platform team recommendation"""
        if score >= 0.95:
            return 'IMMEDIATE_PERMANENT_BAN'
        elif score >= 0.85:
            return 'IMMEDIATE_TEMPORARY_BAN_72H'
        elif score >= 0.75:
            return 'REQUIRE_FULL_VERIFICATION'
        elif score >= 0.6:
            return 'REQUIRE_PHONE_VERIFICATION'
        elif score >= 0.5:
            return 'EXTEND_HOLDING_PERIOD'
        else:
            return 'STANDARD_PROCESSING'


detector = FraudDetector()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


@app.route('/predict', methods=['POST'])
def predict_fraud():
    """
    Predict fraud probability for a user's ad completion.
    In SHADOW_MODE the returned 'action' is rules-based only.
    ML prediction is available in 'shadow_prediction' for offline analysis.
    """
    try:
        user_data = request.get_json()

        if not user_data:
            return jsonify({'error': 'Invalid request body'}), 400

        result = detector.predict(user_data)

        if SHADOW_MODE and result.get('shadow_prediction'):
            logger.info(
                f"[SHADOW] action={result['action']} "
                f"ml={result['shadow_prediction'].get('ml_probability')}"
            )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Service failure must not block the caller – return safe default
        return jsonify({
            'fraud_probability': 0.0,
            'rule_violations': [],
            'action': 'APPROVE',
            'reason': 'Fraud service temporarily unavailable – defaulting to approve',
            'holding_period_hours': 24,
            'requires_verification': False,
            'recommendation': 'STANDARD_PROCESSING',
            'shadow_prediction': None,
            'service_error': True,
        }), 200


@app.route('/batch-predict', methods=['POST'])
def batch_predict_fraud():
    """
    Predict fraud for multiple users (for batch analysis)
    """
    try:
        data = request.get_json()
        users = data.get('users', [])
        
        results = []
        for user_data in users:
            result = detector.predict(user_data)
            result['user_id'] = user_data.get('user_id')
            results.append(result)
        
        return jsonify({'results': results, 'count': len(results)}), 200
    
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/train', methods=['POST'])
def train_model():
    """
    Retrain model with historical data (administrative endpoint)
    Requires authentication in production
    """
    try:
        # In production, this would load historical labeled data
        # For demo, we'll just acknowledge the request
        logger.info("Model retraining initiated")
        
        return jsonify({
            'status': 'training_started',
            'message': 'Model retraining has been queued'
        }), 202
    
    except Exception as e:
        logger.error(f"Training error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/explain/<action>', methods=['POST'])
def explain_decision(action):
    """
    Explain why a specific action was recommended
    Useful for support team reviewing flagged accounts
    """
    try:
        user_data = request.get_json()
        
        rule_result = detector.manual_fraud_rules(user_data)
        
        explanation = {
            'action': action,
            'violations_found': len(rule_result['signals']),
            'violations': rule_result['signals'],
            'feature_weights': {
                k: v for k, v in sorted(
                    detector.FEATURE_WEIGHTS.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:5]  # Top 5 most important
            },
            'user_metrics': {
                'account_age_hours': user_data.get('account_age_hours'),
                'total_ads_watched': user_data.get('total_ads_watched'),
                'unique_devices': user_data.get('unique_devices'),
                'unique_ips': user_data.get('unique_ips'),
                'ads_last_24h': user_data.get('ads_last_24h'),
            }
        }
        
        return jsonify(explanation), 200
    
    except Exception as e:
        logger.error(f"Explanation error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
