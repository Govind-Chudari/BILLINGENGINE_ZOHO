from app import create_app
from models import db
app = create_app()
ctx = app.app_context()
ctx.push()

# Backfill paid_at for existing paid invoices
result = db.session.execute(db.text(
    "UPDATE invoices SET paid_at = generated_at WHERE status = 'paid' AND paid_at IS NULL"
))
db.session.commit()
print(f"Backfilled {result.rowcount} paid invoices with paid_at timestamp")

# Verify
rows = db.session.execute(db.text("SELECT id, status, paid_at, amount_paid, total_amount FROM invoices")).fetchall()
for row in rows:
    print(f"  Invoice #{row[0]}: status={row[1]}, paid_at={row[2]}, amount_paid={row[3]}, total_amount={row[4]}")
