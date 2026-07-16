from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


# Users
class User(db.Model):
    __tablename__ = "users"


    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(80), unique=True, nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(256), nullable=False)
    role       = db.Column(db.String(20), default="user")   
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    budget_limit = db.Column(db.Float, nullable=True)
    plan       = db.Column(db.String(20), default="free")

    objects    = db.relationship("StorageObject", backref="owner", lazy=True)
    usage_logs = db.relationship("UsageLog", backref="user", lazy=True)
    invoices   = db.relationship("Invoice", backref="user", lazy=True)

    @property
    def storage_quota(self):
        plan_quotas = {
            "free": 1 * 1024 * 1024 * 1024,      # 1 GB
            "pro_100": 100 * 1024 * 1024 * 1024,  # 100 GB
            "ent_500": 500 * 1024 * 1024 * 1024   # 500 GB
        }
        return plan_quotas.get(self.plan, 1 * 1024 * 1024 * 1024)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
            "budget_limit": self.budget_limit,
            "plan": self.plan,
            "storage_quota": self.storage_quota
        }
    


# Storage Objects
class StorageObject(db.Model):
    __tablename__ = "objects"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename    = db.Column(db.String(256), nullable=False)
    object_key  = db.Column(db.String(512), nullable=False)   
    file_size   = db.Column(db.BigInteger, default=0)          
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_hash   = db.Column(db.String(32), nullable=True) # MD5 hash
    blockchain_hash = db.Column(db.String(64), nullable=True) # SHA-256 hash for blockchain anchoring
    chain_tx_hash    = db.Column(db.String(128), nullable=True) # Polygon transaction hash
    last_accessed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_size": self.file_size,
            "file_size_kb": round(self.file_size / 1024, 2),
            "uploaded_at": self.uploaded_at.isoformat(),
            "file_hash": self.file_hash,
            "blockchain_hash": self.blockchain_hash,
            "chain_tx_hash": self.chain_tx_hash,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None
        }
    


# Usage Logs
class UsageLog(db.Model):
    __tablename__ = "usage_logs"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    date         = db.Column(db.Date, default=datetime.utcnow)
    storage_used = db.Column(db.BigInteger, default=0)   
    api_calls    = db.Column(db.Integer, default=0)       

    def to_dict(self):
        return {
            "date": self.date.isoformat(),
            "storage_used_mb": round(self.storage_used / (1024 * 1024), 4),
            "api_calls": self.api_calls
        }
    


# Invoice
class Invoice(db.Model):
    __tablename__ = "invoices"

    id               = db.Column(db.Integer,  primary_key=True)
    user_id          = db.Column(db.Integer,  db.ForeignKey("users.id"), nullable=False)
    month            = db.Column(db.String(7),  nullable=False)   # "2026-02"
    year             = db.Column(db.Integer,   nullable=False)
    month_number     = db.Column(db.Integer,   nullable=False)

    # Usage values that were billed
    avg_storage_bytes = db.Column(db.BigInteger, default=0)
    total_api_calls   = db.Column(db.Integer,    default=0)
    days_active       = db.Column(db.Integer,    default=0)

    # Cost breakdown
    storage_cost     = db.Column(db.Float, default=0.0)
    api_cost         = db.Column(db.Float, default=0.0)
    total_amount     = db.Column(db.Float, default=0.0)

    # Pricing rates used (stored so old invoices stay accurate even if rates change)
    rate_storage_per_gb_day  = db.Column(db.Float, default=0.25)
    rate_api_per_call        = db.Column(db.Float, default=0.001)

    # Status
    status           = db.Column(db.String(20), default="generated")  # generated / paid
    amount_paid      = db.Column(db.Float, default=0.0)  # Amount already paid for this cycle
    generated_at     = db.Column(db.DateTime,   default=datetime.utcnow)
    paid_at          = db.Column(db.DateTime,   nullable=True)  # When invoice was paid

    # Billing period this invoice covers (fresh invoices after payment)
    billing_from          = db.Column(db.Date, nullable=True)  # First day of this billing window
    billing_to            = db.Column(db.Date, nullable=True)  # Last day of this billing window
    billing_to_api_calls  = db.Column(db.Integer, default=0)   # api_calls in UsageLog for billing_to at invoice time
                                                                # Used to subtract pre-payment calls from next invoice

    # Blockchain Proof
    invoice_hash     = db.Column(db.String(64), nullable=True) # SHA-256 hash
    chain_tx_hash    = db.Column(db.String(128), nullable=True) # Polygon transaction hash


    def to_dict(self):
        return {
            "id":               self.id,
            "month":            self.month,
            "year":             self.year,
            "month_number":     self.month_number,
            "billing_from":     self.billing_from.isoformat() if self.billing_from else None,
            "billing_to":       self.billing_to.isoformat() if self.billing_to else None,
            "usage": {
                "avg_storage_bytes": self.avg_storage_bytes,
                "avg_storage_mb":    round(self.avg_storage_bytes / (1024 * 1024), 4),
                "avg_storage_gb":    round(self.avg_storage_bytes / (1024 ** 3), 6),
                "total_api_calls":   self.total_api_calls,
                "days_active":       self.days_active
            },
            "costs": {
                "storage_cost":  round(self.storage_cost, 4),
                "api_cost":      round(self.api_cost, 4),
                "total_amount":  round(self.total_amount, 4),
                "amount_paid":   round(self.amount_paid, 4),
                "amount_due":    round(max(0.0, self.total_amount - self.amount_paid), 4)
            },
            "rates": {
                "storage_per_gb_day": self.rate_storage_per_gb_day,
                "api_per_call":       self.rate_api_per_call
            },
            "status":        self.status,
            "generated_at":  self.generated_at.isoformat(),
            "paid_at":       self.paid_at.isoformat() if self.paid_at else None,
            "invoice_hash":  self.invoice_hash,
            "chain_tx_hash": self.chain_tx_hash
        }