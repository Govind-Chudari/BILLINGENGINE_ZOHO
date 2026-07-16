# BillFlow — Cloud Storage Billing Engine

> **Zoho SETU Competition — Project 5**
> Multi-tenant object storage with real-time usage metering and automated monthly invoicing.

![BillFlow Dashboard](./docs/dashboard.png)

---

## 🌟 Features

| Feature | Description |
|---|---|
| **Multi-tenant Storage** | Isolated MinIO buckets per user — no data leakage |
| **Real-time Metering** | Every API call and file operation is logged instantly |
| **Automated Billing** | Monthly invoices generated automatically via Celery |
| **Free Tier** | 1 GB storage + 1,000 API calls free per month |
| **Admin Panel** | Platform-wide analytics, user management, all invoices |
| **PDF Invoices** | Downloadable invoices generated in-browser with jsPDF |
| **Containerized** | Full Docker Compose setup — one command to run everything |
| **Background Tasks** | Celery + Redis for scheduled jobs and email alerts |

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                                                      │
│  React (Nginx) ──→ Flask API ──→ SQLite DB           │
│       :3000          :5000        billing.db         │
│                         │                            │
│                    MinIO S3 (:9000)                  │
│                    Redis   (:6379)                   │
│              Celery Worker + Beat                    │
│              Flower Monitor (:5555)                  │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend:** Python 3.11, Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt
**Frontend:** React 18, Tailwind CSS, Recharts, Axios, jsPDF
**Storage:** MinIO (S3-compatible object storage)
**Database:** SQLite (easily swappable to PostgreSQL)
**Queue:** Celery + Redis
**Monitoring:** Flower
**Containers:** Docker + Docker Compose

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git

### One-command setup
```bash
git clone https://github.com/yourusername/setu-billing-engine.git
cd setu-billing-engine
docker-compose up --build
```

That's it. All 7 services start automatically.

| Service | URL |
|---|---|
| React App | http://localhost:3000 |
| Flask API | http://localhost:5000 |
| MinIO Console | http://localhost:9001 |
| Flower Monitor | http://localhost:5555 |

### Create admin account
```bash
docker exec -it billflow-backend python create_admin.py
```

Login with `admin` / `Admin@1234`

---

## 📁 Project Structure
```
setu-billing-engine/
│
├── docker-compose.yml
│
├── backend/
│   ├── app.py                  # Flask app factory
│   ├── config.py               # Environment config
│   ├── models.py               # SQLAlchemy models
│   ├── celery_app.py           # Celery configuration
│   ├── tasks.py                # Background tasks
│   ├── create_admin.py         # Admin setup script
│   ├── routes/
│   │   ├── auth.py             # Register, login, profile
│   │   ├── objects.py          # File upload/download/delete
│   │   ├── usage.py            # Usage tracking endpoints
│   │   ├── billing.py          # Billing and invoices
│   │   ├── admin.py            # Admin-only endpoints
│   │   └── tasks.py            # Manual task triggers
│   ├── services/
│   │   ├── minio_service.py    # Object storage operations
│   │   ├── usage_service.py    # Usage logging and queries
│   │   └── billing_service.py  # Billing calculations
│   ├── utils/
│   │   └── validators.py       # File validation helpers
│   └── tests/
│       ├── conftest.py         # Pytest fixtures
│       ├── test_auth.py        # Auth endpoint tests
│       ├── test_usage_billing.py
│       ├── test_admin.py
│       └── test_storage.py
│
└── frontend/
    ├── nginx.conf
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Files.jsx
        │   ├── Usage.jsx
        │   ├── Billing.jsx
        │   ├── AdminDashboard.jsx
        │   ├── AdminUsers.jsx
        │   ├── AdminInvoices.jsx
        │   └── AdminTasks.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── UploadZone.jsx
        │   ├── DeleteModal.jsx
        │   └── StorageBar.jsx
        └── utils/
            ├── fileHelpers.js
            └── generatePDF.js
```

---

## 💰 Pricing Model

| Resource | Free Tier | Paid Rate |
|---|---|---|
| Storage | 1 GB / month | ₹0.25 / GB / day |
| API Calls | 1,000 / month | ₹0.001 / call |

Free tier is deducted before billing. An account using exactly 1 GB and 1,000 API calls pays ₹0.

---

## 🔌 API Reference

### Auth
```
POST /api/register    { username, email, password }
POST /api/login       { username, password }
GET  /api/profile     → requires JWT
```

### Files
```
POST   /api/objects/upload      multipart/form-data
GET    /api/objects/list
GET    /api/objects/download/<filename>
DELETE /api/objects/delete/<filename>
GET    /api/objects/storage
```

### Usage
```
GET /api/usage/today
GET /api/usage/history?days=30
GET /api/usage/current-month
GET /api/usage/alltime
```

### Billing
```
GET  /api/billing/estimate
GET  /api/billing/calculate?year=&month=
POST /api/billing/generate        { year, month }
GET  /api/billing/invoices
POST /api/billing/invoices/:id/pay
```

### Admin (admin role required)
```
GET  /api/admin/overview
GET  /api/admin/users
GET  /api/admin/invoices
GET  /api/admin/platform-stats
POST /api/admin/users/:id/generate-invoice
PUT  /api/admin/users/:id/role
POST /api/admin/invoices/:id/pay
```

---

## 🧪 Running Tests
```bash
cd backend
pytest
pytest --cov=. --cov-report=term-missing
```

---

## 📅 15-Day Build Log

| Day | What Was Built |
|---|---|
| 1–2 | Project setup, Flask skeleton, database models |
| 3–4 | JWT auth (register/login), MinIO integration |
| 5–6 | File upload/download/delete, storage quota enforcement |
| 7 | Usage tracking — per-user daily API call and storage logging |
| 8 | Billing engine — free tier, cost calculation, invoice model |
| 9 | React frontend — auth pages, responsive navbar, dashboard |
| 10 | File Manager UI — drag & drop upload, file list, delete modal |
| 11 | Usage charts (Recharts), billing page, PDF invoice download |
| 12 | Admin panel — user management, all invoices, role control |
| 13 | Docker — multi-stage builds, Nginx reverse proxy, Compose |
| 14 | Celery — automated invoicing, storage alerts, daily digest |
| 15 | pytest suite, README, polish, demo |

---

