from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EL HANNORA Analytics & AI Service",
    description="Python microservice for analytics, fraud detection, and AI features",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Pydantic Models ============
class TrustScoreRequest(BaseModel):
    user_id: str
    ad_count: int
    avg_response_time: float
    completion_rate: float
    positive_reviews: int
    negative_reviews: int
    account_age_days: int

class TrustScoreResponse(BaseModel):
    user_id: str
    trust_score: float
    factors: dict

class FraudDetectionRequest(BaseModel):
    user_id: str
    ad_id: str
    views: int
    clicks: int
    likes: int
    creation_time: str
    user_behavior: dict

class FraudDetectionResponse(BaseModel):
    ad_id: str
    is_fraudulent: bool
    fraud_probability: float
    reasons: List[str]

class RecommendationRequest(BaseModel):
    user_id: str
    user_preferences: List[str]
    browsing_history: List[str]
    limit: int = 10

class RecommendationResponse(BaseModel):
    recommendations: List[str]
    confidence_scores: List[float]

class AnalyticsRequest(BaseModel):
    ad_id: str
    start_date: str
    end_date: str

class AnalyticsResponse(BaseModel):
    ad_id: str
    total_views: int
    total_clicks: int
    ctr: float
    engagement_rate: float

# ============ Health Check ============
@app.get("/")
async def root():
    return {
        "service": "EL HANNORA Python Analytics Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ============ Trust Score Calculation ============
@app.post("/api/trust-score", response_model=TrustScoreResponse)
async def calculate_trust_score(request: TrustScoreRequest):
    """
    Calculate user trust score based on multiple factors
    """
    try:
        # Trust score algorithm
        weights = {
            'ad_count': 0.15,
            'response_time': 0.20,
            'completion_rate': 0.25,
            'reviews': 0.25,
            'account_age': 0.15
        }
        
        # Normalize factors (0-100 scale)
        ad_count_score = min(request.ad_count * 2, 100)
        response_time_score = max(0, 100 - (request.avg_response_time * 10))
        completion_score = request.completion_rate * 100
        
        # Review score
        total_reviews = request.positive_reviews + request.negative_reviews
        review_score = (request.positive_reviews / total_reviews * 100) if total_reviews > 0 else 50
        
        # Account age score (max 100 at 365 days)
        account_age_score = min((request.account_age_days / 365) * 100, 100)
        
        # Calculate weighted trust score
        trust_score = (
            ad_count_score * weights['ad_count'] +
            response_time_score * weights['response_time'] +
            completion_score * weights['completion_rate'] +
            review_score * weights['reviews'] +
            account_age_score * weights['account_age']
        )
        
        factors = {
            'ad_activity': round(ad_count_score, 2),
            'responsiveness': round(response_time_score, 2),
            'completion': round(completion_score, 2),
            'reputation': round(review_score, 2),
            'account_maturity': round(account_age_score, 2)
        }
        
        logger.info(f"Calculated trust score for user {request.user_id}: {trust_score:.2f}")
        
        return TrustScoreResponse(
            user_id=request.user_id,
            trust_score=round(trust_score, 2),
            factors=factors
        )
    except Exception as e:
        logger.error(f"Error calculating trust score: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ Fraud Detection ============
@app.post("/api/fraud-detection", response_model=FraudDetectionResponse)
async def detect_fraud(request: FraudDetectionRequest):
    """
    Detect fraudulent activity in ads
    """
    try:
        fraud_indicators = []
        fraud_score = 0.0
        
        # Check click-through rate anomaly
        ctr = (request.clicks / request.views * 100) if request.views > 0 else 0
        if ctr > 50:  # Suspiciously high CTR
            fraud_indicators.append("Abnormally high click-through rate")
            fraud_score += 0.3
        
        # Check view velocity
        if request.views > 10000 and 'rapid_growth' in request.user_behavior:
            fraud_indicators.append("Suspicious view velocity")
            fraud_score += 0.25
        
        # Check engagement ratio
        engagement_ratio = (request.likes / request.views * 100) if request.views > 0 else 0
        if engagement_ratio > 30:
            fraud_indicators.append("Unrealistic engagement ratio")
            fraud_score += 0.25
        
        # Check bot patterns
        if request.user_behavior.get('bot_like_behavior', False):
            fraud_indicators.append("Bot-like behavior detected")
            fraud_score += 0.4
        
        is_fraudulent = fraud_score > 0.5
        
        logger.info(f"Fraud detection for ad {request.ad_id}: {fraud_score:.2f}")
        
        return FraudDetectionResponse(
            ad_id=request.ad_id,
            is_fraudulent=is_fraudulent,
            fraud_probability=round(fraud_score, 2),
            reasons=fraud_indicators if fraud_indicators else ["No fraud detected"]
        )
    except Exception as e:
        logger.error(f"Error in fraud detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ AI Recommendations ============
@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Generate personalized ad recommendations using collaborative filtering
    """
    try:
        # Simplified recommendation algorithm
        # In production, this would use ML models (e.g., collaborative filtering, content-based)
        
        # Mock recommendations based on preferences
        recommendations = []
        confidence_scores = []
        
        # Generate mock recommendations
        for i, pref in enumerate(request.user_preferences[:request.limit]):
            recommendations.append(f"ad_{pref}_{i}")
            confidence_scores.append(round(0.9 - (i * 0.05), 2))
        
        logger.info(f"Generated {len(recommendations)} recommendations for user {request.user_id}")
        
        return RecommendationResponse(
            recommendations=recommendations,
            confidence_scores=confidence_scores
        )
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ Analytics & Forecasting ============
@app.post("/api/analytics", response_model=AnalyticsResponse)
async def get_analytics(request: AnalyticsRequest):
    """
    Calculate analytics and forecast revenue for an ad
    """
    try:
        # Mock analytics calculation
        # In production, this would query actual data from database
        
        total_views = 5000
        total_clicks = 250
        ctr = (total_clicks / total_views) * 100
        engagement_rate = 0.15
        
        logger.info(f"Generated analytics for ad {request.ad_id}")
        
        return AnalyticsResponse(
            ad_id=request.ad_id,
            total_views=total_views,
            total_clicks=total_clicks,
            ctr=round(ctr, 2),
            engagement_rate=round(engagement_rate, 2)
        )
    except Exception as e:
        logger.error(f"Error generating analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
