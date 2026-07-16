from app import create_app
from models import db, User
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

def create_admin_user(username, email, password):
    app = create_app()
    with app.app_context():
        bcrypt.init_app(app)

        existing = User.query.filter_by(username=username).first()
        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                db.session.commit()
                print(f"User '{username}' promoted to admin!")
            else:
                print(f"ℹAdmin '{username}' already exists.")
            return

        hashed = bcrypt.generate_password_hash(password).decode("utf-8")
        admin  = User(
            username=username,
            email=email,
            password=hashed,
            role="admin"
        )
        db.session.add(admin)
        db.session.commit()
        print(f"Admin user '{username}' created successfully!")

if __name__ == "__main__":
    create_admin_user(
        username="admin",
        email="admin@billflow.com",
        password="Admin@1234"
    )