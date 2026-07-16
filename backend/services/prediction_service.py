import numpy as np
from models import UsageLog, User
from config import Config
from datetime import datetime
from calendar import monthrange

def predict_month_end_bill(user_id):
    today = datetime.utcnow().date()
    year = today.year
    month = today.month
    day_of_month = today.day
    _, days_in_month = monthrange(year, month)
    
    logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date >= today.replace(day=1)
    ).order_by(UsageLog.date).all()
    
    if not logs:
        return {"predicted_total": 0.0, "status": "ok"}
        
    # Simple linear extrapolation based on velocity
    total_api = sum(log.api_calls for log in logs)
    latest_storage = logs[-1].storage_used
    
    days_elapsed = len(logs)
    if days_elapsed == 0:
        return {"predicted_total": 0.0, "status": "ok"}
        
    daily_api_velocity = total_api / days_elapsed
    predicted_api = daily_api_velocity * days_in_month
    
    billable_api = max(0, predicted_api - Config.FREE_API_CALLS)
    api_cost = billable_api * Config.PRICE_API_PER_CALL
    
    billable_storage = max(0, latest_storage - Config.FREE_STORAGE_BYTES)
    storage_gb = billable_storage / (1024 ** 3)
    storage_cost = storage_gb * days_in_month * Config.PRICE_STORAGE_PER_GB_DAY
    
    predicted_total = api_cost + storage_cost
    
    user = User.query.get(user_id)
    budget = user.budget_limit
    
    status = "ok"
    if budget:
        if predicted_total >= budget:
            status = "shock_warning"
        elif predicted_total >= budget * 0.8:
            status = "approaching_limit"
            
    return {
        "predicted_total": round(predicted_total, 4),
        "predicted_api_cost": round(api_cost, 4),
        "predicted_storage_cost": round(storage_cost, 4),
        "budget_limit": budget,
        "status": status,
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month
    }
