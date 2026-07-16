import numpy as np
from sklearn.ensemble import IsolationForest
from models import UsageLog
from datetime import datetime, timedelta

def build_user_profile(user_id):
    """
    Fetches historical usage and builds features.
    """
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
    logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date >= thirty_days_ago
    ).order_by(UsageLog.date).all()
    
    if not logs:
        return None
        
    features = []
    for log in logs:
        features.append([log.api_calls, log.storage_used])
        
    return features

def score_today_anomaly(user_id):
    """
    Scores today's usage against the last 30 days.
    """
    features = build_user_profile(user_id)
    if not features or len(features) < 3: # Need at least a few days of data
        return {"score": 0.0, "is_suspicious": False}
        
    # Get today
    today_log = UsageLog.query.filter_by(user_id=user_id, date=datetime.utcnow().date()).first()
    if not today_log:
        return {"score": 0.0, "is_suspicious": False}
        
    X_train = np.array(features)
    X_today = np.array([[today_log.api_calls, today_log.storage_used]])
    
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(X_train)
    
    score = model.score_samples(X_today)[0]
    
    # Normalize score roughly to 0-1 (higher = more anomalous)
    normalized_score = max(0.0, min(1.0, -score))
    
    is_suspicious = normalized_score > 0.75
    
    return {
        "score": round(float(normalized_score), 2),
        "is_suspicious": is_suspicious,
        "api_calls_today": today_log.api_calls,
        "storage_today": today_log.storage_used
    }
