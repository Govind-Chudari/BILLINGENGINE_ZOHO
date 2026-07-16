from models import db, StorageObject
from datetime import datetime, timedelta
from config import Config
from sqlalchemy import func

def get_optimization_report(user_id):
    """
    Analyzes user storage for duplicate, stale, and compressible files.
    """
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    
    # Stale Files
    stale_files = StorageObject.query.filter(
        StorageObject.user_id == user_id,
        StorageObject.last_accessed_at < ninety_days_ago
    ).all()
    stale_bytes = sum(f.file_size for f in stale_files)
    
    # Duplicate Files (same hash, keep one)
    duplicate_hashes = db.session.query(
        StorageObject.file_hash, func.count(StorageObject.id)
    ).filter(
        StorageObject.user_id == user_id,
        StorageObject.file_hash != None
    ).group_by(StorageObject.file_hash).having(func.count(StorageObject.id) > 1).all()
    
    dup_files = []
    dup_bytes = 0
    for file_hash, count in duplicate_hashes:
        files = StorageObject.query.filter_by(user_id=user_id, file_hash=file_hash).all()
        dups = files[1:]
        dup_files.extend(dups)
        dup_bytes += sum(f.file_size for f in dups)
        
    # Compressible Files
    compressible_exts = {'.csv', '.json', '.txt', '.log'}
    comp_files = []
    comp_bytes_saved = 0
    
    all_files = StorageObject.query.filter_by(user_id=user_id).all()
    for f in all_files:
        if any(f.filename.endswith(ext) for ext in compressible_exts):
            comp_files.append(f)
            comp_bytes_saved += int(f.file_size * 0.6)
            
    total_saved_bytes = stale_bytes + dup_bytes + comp_bytes_saved
    total_saved_gb = total_saved_bytes / (1024 ** 3)
    monthly_savings = total_saved_gb * Config.PRICE_STORAGE_PER_GB_DAY * 30
    
    return {
        "stale_files": [f.to_dict() for f in stale_files],
        "stale_bytes": stale_bytes,
        "duplicate_files": [f.to_dict() for f in dup_files],
        "duplicate_bytes": dup_bytes,
        "compressible_files": [f.to_dict() for f in comp_files],
        "compressible_bytes_saved": comp_bytes_saved,
        "total_saved_bytes": total_saved_bytes,
        "estimated_monthly_savings": round(monthly_savings, 4)
    }
