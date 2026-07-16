# BillFlow: Complete Beginner Guide
## Everything Explained From Scratch (Like You're Learning For First Time)

---

# TABLE OF CONTENTS
1. What is BillFlow? (Simple Explanation)
2. Why Was This Project Built?
3. Tech Stack Explained (Each Technology)
4. How Everything Works Together
5. Project Structure (File Organization)
6. Step-by-Step Workflow
7. Installation & Running
8. Understanding The Code
9. FAQ & Common Questions

---

# 1. WHAT IS BILLFLOW? (SIMPLE EXPLANATION)

## In One Sentence
**BillFlow is an app where users can upload files, and we automatically track how much they use and charge them monthly** (like how your phone bill works - you use it, phone company charges you).

## Real-World Analogy
Think of it like **Dropbox** (file storage app):
- You upload files
- App tracks storage used (how much space you took)
- App tracks API calls (how many times you accessed files)
- At month end: Automatic bill generated
- You pay based on usage

## What Users Do
```
User Journey:

Day 1: User registers on BillFlow
       ├─ Creates account: username, email, password
       └─ Gets 1 GB free storage + 1,000 free API calls

Days 2-28: User uploads files (project.pdf, photo.jpg, data.csv)
       ├─ BillFlow tracks: "User used 30 MB storage, 2,450 API calls"
       ├─ BillFlow shows: "Estimated bill: ₹1.45"
       └─ User can see real-time cost forecast

Day 1st of Next Month: Automatic invoice created
       ├─ BillFlow calculates exact cost
       ├─ Sends email: "Your invoice for February is ₹1.45"
       ├─ User can download PDF invoice
       └─ User can mark as paid
```

## What Makes BillFlow Special?

### 1. Real-Time Tracking
- Every file upload logged instantly
- Every API call counted automatically
- Users see live cost estimate
- No surprises at month end ✓

### 2. Automated Billing
- Invoices generated automatically (no manual work)
- Happens at 2 AM on 1st of month
- No human involvement needed
- Runs even if developer is sleeping ✓

### 3. Multi-Tenant (Complete Isolation)
- User A's files completely separate from User B
- User A cannot see User B's storage
- Even if system hacked, no data leak between users ✓

### 4. Easy Deployment
- All services in Docker containers
- Start entire app with: `docker-compose up`
- No complicated setup ✓

---

# 2. WHY WAS THIS PROJECT BUILT?

## The Problem We're Solving

### Problem 1: Users Don't Know Cost Until End of Month
**Without BillFlow:**
- Day 1-28: User uploads files (doesn't know cost)
- Day 1st of next month: Surprise! "You owe ₹50"
- User: "What?? I thought it was cheaper!"
- Result: Users angry, churn rate high

**With BillFlow:**
- User sees real-time: "Current usage will cost ₹1.45"
- User: "That's cheap, I'll keep using"
- Result: Transparent, users happy ✓

### Problem 2: Manual Billing = Errors
**Without BillFlow:**
- Admin manually calculates each user's cost
- Error: Forgot to include API calls
- Error: Used old pricing model
- Error: Invoiced same user twice
- Result: Hours of manual work, mistakes

**With BillFlow:**
- Celery automatically generates invoices
- Same formula every time
- Runs at 2 AM automatically
- No human error ✓

### Problem 3: User Data Isolation is Complex
**Without BillFlow:**
- Need complex database permissions
- User A accidentally gets access to User B's data
- Data leak possible
- Nightmare for compliance

**With BillFlow:**
- Each user gets their own bucket in MinIO
- Impossible to access other's files
- Even code bug can't leak data ✓

### Problem 4: Hard to Deploy
**Without BillFlow:**
- Need to install: Python, Node.js, Redis, MinIO
- Each has different setup steps
- Different on Mac vs Windows vs Linux
- Examiner doesn't want to spend 2 hours setting up

**With BillFlow:**
- Docker handles everything
- One command: `docker-compose up`
- Works on Mac, Windows, Linux same way
- Examiner can run in 1 minute ✓

---

# 3. TECH STACK EXPLAINED
## (Each Technology - What It Does & Why We Use It)

## 🖥️ BACKEND (Server-Side Code)

### **Flask (Python Web Framework)**
**What it is:**
- A lightweight framework for building web applications
- Helps handle HTTP requests (GET, POST, etc.)
- Similar to: Django, FastAPI, Express.js

**What it does in BillFlow:**
```
User clicks "Upload File"
    ↓
Browser sends: POST /api/objects/upload
    ↓
Flask receives request
    ↓
Flask validates: Is file < 10 MB? Is user logged in?
    ↓
Flask uploads to MinIO
    ↓
Flask creates database record
    ↓
Flask responds: "File uploaded successfully"
    ↓
Browser shows: ✓ File uploaded
```

**Why Flask?**
- Simple to learn
- Perfect for small-medium projects
- Great community
- Python = easy to read

**Code Example:**
```python
from flask import Flask

app = Flask(__name__)

@app.route('/api/login', methods=['POST'])
def login():
    # Get username and password from request
    # Check if correct
    # Create JWT token
    # Return token to user
    return {'token': '...', 'username': 'john'}

if __name__ == '__main__':
    app.run()  # Starts server on localhost:5000
```

---

### **SQLAlchemy (Database ORM)**
**What it is:**
- A tool that helps you talk to the database
- You write Python code instead of SQL

**What it does in BillFlow:**
```
Database structure:

users table:
├─ id: 1
├─ username: "johndoe"
├─ email: "john@example.com"
├─ password: (hashed safely)
└─ role: "user" or "admin"

storage_objects table:
├─ id: 100
├─ user_id: 1
├─ filename: "project.pdf"
├─ file_size: 2097152 bytes
└─ uploaded_at: 2026-02-27 10:30:00

usage_log table:
├─ id: 500
├─ user_id: 1
├─ date: 2026-02-27
├─ api_calls: 89
└─ storage_used: 32000000 bytes

invoices table:
├─ id: 42
├─ user_id: 1
├─ month: "February 2026"
├─ total_amount: 1.45
└─ status: "pending" or "paid"
```

**Why SQLAlchemy?**
- Prevents SQL injection attacks
- Makes code easier to read
- Automatic relationships between tables

**Code Example:**
```python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    password = Column(String)  # Hashed securely

# Instead of writing SQL like:
# SELECT * FROM users WHERE username = 'john'

# You write Python like:
user = User.query.filter_by(username='john').first()
print(user.email)  # "john@example.com"
```

---

### **SQLite (Database)**
**What it is:**
- A simple database that stores data in a file
- No server needed, just a file

**What it does in BillFlow:**
- Stores all user info (accounts, passwords)
- Stores all file metadata (what files uploaded)
- Stores usage logs (API calls, storage used)
- Stores invoices (billing history)

**Why SQLite?**
- For development/demo: Perfect
- For small projects: Works great
- For scaling: We'll migrate to PostgreSQL later

**File Location:**
```
backend/
└─ billing.db  ← This is the entire database (single file!)
```

**Important:** Database is persistent
- When you stop Docker container, data is still there
- When you restart, data loads automatically

---

## 🌐 FRONTEND (What Users See)

### **React (JavaScript Framework)**
**What it is:**
- A framework for building interactive websites
- Makes pages respond to user actions instantly
- Like: Vue, Angular, Svelte

**What it does in BillFlow:**
```
User views: http://localhost:3000

React renders:
├─ Login page
│  ├─ Username input field
│  ├─ Password input field
│  └─ Login button
│
├─ Dashboard page (after login)
│  ├─ Storage bar (32 MB / 50 MB used)
│  ├─ API call counter (2,450 calls)
│  └─ Estimated bill (₹1.45)
│
├─ File Manager page
│  ├─ Drag & drop upload zone
│  ├─ List of uploaded files
│  └─ Download/Delete buttons
│
└─ Billing page
   ├─ Cost breakdown chart
   ├─ Invoice history
   └─ Download PDF button
```

**Why React?**
- Super fast (doesn't reload page)
- Great for real-time updates
- Large community with lots of resources

**Code Example:**
```javascript
import React, { useState } from 'react'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    
    const handleLogin = async () => {
        // Send username & password to Flask backend
        const response = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({username, password})
        })
        
        // Backend responds with token
        const data = await response.json()
        localStorage.setItem('token', data.token)
        
        // Redirect to dashboard
        window.location.href = '/dashboard'
    }
    
    return (
        <div>
            <input 
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input 
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>
        </div>
    )
}
```

---

### **Tailwind CSS (Styling)**
**What it is:**
- A tool for making websites look pretty
- Uses pre-made CSS classes

**What it does in BillFlow:**
```
<div className="bg-blue-500 p-4 rounded-lg shadow">
    ↓
Blue box with padding, rounded corners, and shadow

<div className="grid grid-cols-3 gap-4">
    ↓
3 columns layout with gaps between items

<div className="hidden sm:block">
    ↓
Hidden on mobile, visible on desktop
```

**Why Tailwind?**
- Responsive design (mobile + desktop)
- Looks professional out of the box
- Fast to build

---

## 🪣 STORAGE (File Storing)

### **MinIO (S3-Compatible Object Storage)**
**What it is:**
- Like AWS S3 but runs locally
- Stores files the same way as Amazon AWS
- Provides web console to manage files

**What it does in BillFlow:**
```
When user uploads file.pdf:

1. User uploads file
   ↓
2. Flask receives file
   ↓
3. Flask uploads to MinIO:
   Bucket: "user-johndoe"
   Key: "file.pdf"
   ↓
4. MinIO stores on disk

User storage isolation:
├─ user-admin bucket
│  ├─ report.pdf
│  └─ photo.jpg
├─ user-johndoe bucket
│  ├─ file.pdf
│  └─ data.csv
└─ user-alice bucket
   └─ presentation.pptx

Security: 
- User A cannot access bucket user-johndoe
- User B cannot access bucket user-alice
- Isolation at storage layer (most secure)
```

**Why MinIO?**
- Same API as AWS S3 (learn once, use anywhere)
- Easy to deploy locally
- Supports multi-tenancy (per-user buckets)
- Scales to unlimited storage

**Web Console:**
- Access at: http://localhost:9001
- Can upload/download files manually
- Can create buckets
- Can manage permissions

---

## ⏰ BACKGROUND JOBS (Automatic Tasks)

### **Celery (Task Queue)**
**What it is:**
- A system that runs jobs in background
- Doesn't block main application
- Like a to-do list that gets executed automatically

**What it does in BillFlow:**
```
Scheduled Tasks:

Every 1st of month at 2 AM:
├─ generate_all_invoices()
│  ├─ For each user: Calculate usage
│  ├─ Create Invoice record
│  └─ Send email to user

Every day at 9 AM:
├─ send_storage_alerts()
│  └─ Email users if > 80% quota used

Every day at 8 AM:
├─ send_daily_digest()
│  └─ Email each user their daily usage

Every hour:
├─ take_usage_snapshot()
│  └─ Log platform-wide statistics
```

**Why Celery?**
- API doesn't block waiting for task
- User doesn't wait for billing calculation
- Can handle thousands of tasks

**Code Example:**
```python
from celery import Celery

celery = Celery('app')

@celery.task
def generate_invoice(user_id):
    # This runs in background
    # Takes 5 seconds
    # API doesn't wait for it
    
    user = User.query.get(user_id)
    bill = calculate_bill(user_id)
    invoice = create_invoice(user_id, bill)
    send_email(user.email, invoice)

# Trigger task from Flask route:
@app.route('/api/billing/generate')
def billing_route():
    # This runs immediately (returns in 10ms)
    generate_invoice.delay(user_id=5)
    return {'message': 'Invoice generation started'}
```

---

### **Redis (Message Broker)**
**What it is:**
- A fast database that stores messages
- Celery uses it to store list of tasks

**What it does in BillFlow:**
```
Redis queue:

When Celery Beat triggers task:
1. Celery Beat: "Hey Redis, run generate_invoices at 2 AM"
2. Redis stores in queue: [{ task: generate_invoices, time: 2026-03-01 02:00 }]
3. Celery Worker polls Redis: "Any tasks for me?"
4. Redis: "Yes! Run generate_invoices"
5. Celery Worker executes task
6. Redis stores result: [{ task_id: abc123, status: SUCCESS }]
7. Flower reads from Redis: Shows status in UI
```

**Why Redis?**
- Super fast
- Works perfectly with Celery
- Reliable

---

## 🐳 CONTAINERIZATION

### **Docker (Containerization)**
**What it is:**
- Like a box that contains everything your app needs
- Same box works on any computer (Mac, Windows, Linux)

**What it does in BillFlow:**
```
Without Docker:
├─ Install Python 3.11
├─ Install Node.js 20
├─ Install Redis
├─ Install MinIO
├─ Set environment variables
├─ Configure network
└─ Hope everything works together

With Docker:
└─ docker-compose up
   └─ Everything starts (7 services!)
      ├─ Frontend (React)
      ├─ Backend (Flask)
      ├─ MinIO (Storage)
      ├─ Redis (Queue)
      ├─ Celery Worker (Job executor)
      ├─ Celery Beat (Job scheduler)
      └─ Flower (Monitoring)
```

**Why Docker?**
- Consistency (runs same on laptop, production, examiner's computer)
- Easy deployment
- Isolation (containers don't interfere)

**Dockerfile Example:**
```dockerfile
# This is like a recipe for creating container

FROM python:3.11-slim
# Use Python 3.11 as base

WORKDIR /app
# Set working directory inside container

COPY requirements.txt .
# Copy dependencies file

RUN pip install -r requirements.txt
# Install dependencies

COPY . .
# Copy all code

EXPOSE 5000
# Expose port 5000

CMD ["python", "app.py"]
# Command to run when container starts
```

### **Docker Compose (Multi-Container Orchestration)**
**What it is:**
- A tool that manages multiple Docker containers
- One file to define all services

**What it does in BillFlow:**
```
docker-compose.yml:

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"  ← Access React on localhost:3000
  
  backend:
    build: ./backend
    ports:
      - "5000:5000"  ← Access Flask on localhost:5000
  
  minio:
    image: minio/minio
    ports:
      - "9001:9001"  ← Access MinIO console on localhost:9001
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"  ← Internal Redis for Celery
  
  celery-worker:
    build: ./backend
    command: celery -A celery_app worker
  
  celery-beat:
    build: ./backend
    command: celery -A celery_app beat
  
  flower:
    image: mher/flower
    ports:
      - "5555:5555"  ← Access Flower on localhost:5555

# One command starts everything:
# docker-compose up --build
```

---

## 🔐 SECURITY (JWT Tokens)

### **JWT (JSON Web Token)**
**What it is:**
- A secure way to pass user identity without passwords
- Like a ticket you get after logging in

**What it does in BillFlow:**
```
Step 1: User logs in
├─ User sends: username + password
└─ Flask checks: Is password correct?

Step 2: Flask creates JWT token
├─ Token contains: user_id=5, role="user"
├─ Token is signed: Only Flask can create valid tokens
└─ Token expires: In 15 minutes

Step 3: User stores token
├─ React saves token in localStorage
└─ Token sent with every request

Step 4: User uploads file
├─ React sends: Authorization: Bearer eyJhbGciOiJ...
├─ Flask validates: Is token valid?
├─ Flask extracts: user_id=5 from token
└─ Flask proceeds: Upload file for user 5

Step 5: User logs out or token expires
├─ React clears token from localStorage
├─ User needs to login again
└─ Old token becomes invalid
```

**Why JWT?**
- Stateless (server doesn't store token info)
- Scalable (works with multiple servers)
- Mobile-friendly (no cookies needed)

**Code Example:**
```python
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

@app.route('/api/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password(user.password, password):
        # Create token that expires in 15 minutes
        token = create_access_token(
            identity=user.id,
            additional_claims={'role': user.role}
        )
        return {'token': token, 'user_id': user.id}
    
    return {'error': 'Invalid credentials'}, 401

@app.route('/api/profile')
@jwt_required()  # This checks token is valid
def get_profile():
    user_id = get_jwt_identity()  # Extracted from token
    user = User.query.get(user_id)
    return {'username': user.username, 'email': user.email}
```

---

# 4. HOW EVERYTHING WORKS TOGETHER

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────┐
│           USER BROWSER (localhost:3000)         │
│  React App + Tailwind CSS                       │
│  ├─ Login page                                  │
│  ├─ Dashboard                                   │
│  ├─ File Manager                                │
│  ├─ Usage Charts                                │
│  ├─ Billing page                                │
│  └─ Admin panel                                 │
└─────────────┬───────────────────────────────────┘
              │
              │ HTTP Requests (API calls)
              │
        ┌─────▼──────┐
        │   NGINX    │
        │  (Reverse  │
        │   Proxy)   │
        └─────┬──────┘
              │
              │ Proxies /api/* to backend
              │
        ┌─────▼─────────────────────────────────────┐
        │   FLASK BACKEND (localhost:5000)          │
        │   ├─ /api/auth (register, login)         │
        │   ├─ /api/objects (upload, download)     │
        │   ├─ /api/billing (invoices, estimate)   │
        │   ├─ /api/usage (tracking, history)      │
        │   ├─ /api/admin (management)             │
        │   └─ All protected by JWT                 │
        └─────┬──────────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────┐
    │         │         │          │
    ▼         ▼         ▼          ▼
┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│SQLite│ │MinIO │ │ Redis  │ │ Celery   │
│  DB  │ │Store │ │ Queue  │ │ (Worker) │
│      │ │(S3)  │ │        │ │(Executor)│
└──────┘ └──────┘ └────────┘ └──────────┘
  │        │        │             │
  │        │        │             │
  │        │        │        Every 1st of month:
  │        │        │        ├─ generate_invoices()
  │        │        │        ├─ send_alerts()
  │        │        │        └─ send_digest()
  │        │        │
  │        │    (Scheduled by)
  │        │
  │   (Stores files)
  │   (per user bucket)
  │
  │(Stores user info)
  │(Stores usage logs)
  │(Stores invoices)

Flower Dashboard (localhost:5555):
├─ Shows all Celery tasks
├─ Shows success/failure status
└─ Shows task execution time
```

## Example: Complete User Journey

```
DAY 1 - REGISTRATION:

1. User visits: http://localhost:3000
   React shows: Register page
   
2. User enters: username=johndoe, email=john@..., password=Pass@123
   
3. User clicks: Register button
   React sends: POST /api/register with form data
   
4. Flask receives request:
   ├─ Validate: Password strong enough? ✓
   ├─ Validate: Username not taken? ✓
   ├─ Hash password: bcrypt(Pass@123) = $2b$10$...
   ├─ Create user record in SQLite
   ├─ Create bucket: user-johndoe in MinIO
   ├─ Initialize usage_log: 1 GB free, 1000 API calls free
   └─ Create JWT token
   
5. Flask responds: {token: "eyJhb...", user_id: 5, role: "user"}
   
6. React receives:
   ├─ Save token in localStorage
   ├─ Redirect to /dashboard
   └─ Show welcome message

---

DAY 2 - FILE UPLOAD:

1. User clicks: File Manager page
   React shows: Upload zone (drag & drop)
   
2. User drags: project.pdf (2 MB)
   React shows: Progress bar
   
3. React validates:
   ├─ Size: 2 MB < 10 MB? ✓
   ├─ Extension: .pdf is allowed? ✓
   └─ Prepares: FormData
   
4. React sends: POST /api/objects/upload
   Headers: Authorization: Bearer eyJhb...
   Body: file content + metadata
   
5. Flask receives:
   ├─ Middleware: log_api_call(user_id=5)
   │  └─ UsageLog: api_calls = 1
   ├─ @jwt_required(): Validate token
   │  └─ Extract: user_id=5
   ├─ Validate file: size, extension, path traversal
   ├─ MinIO upload: bucket=user-johndoe, key=project.pdf
   ├─ Database: Create StorageObject record
   ├─ Usage: Update storage snapshot
   │  └─ Query MinIO: total size = 2 MB
   │  └─ UsageLog: storage_used = 2000000 bytes
   └─ Respond: {message: "File uploaded", filename: "project.pdf"}
   
6. React receives:
   ├─ Show success: "✓ File uploaded"
   ├─ Refresh file list: GET /api/objects/list
   ├─ Update storage bar: 2 MB / 50 MB (4%)
   ├─ Update API counter: 2 calls used
   └─ Show in file list

---

DAY 28 - BILLING FORECAST:

1. User clicks: Billing page
   React shows: Cost breakdown, estimated bill
   
2. React sends: GET /api/billing/estimate
   Headers: Authorization: Bearer eyJhb...
   
3. Flask receives:
   ├─ @jwt_required(): Validate token
   ├─ Extract: user_id=5
   ├─ Query UsageLog: Last 28 days for user 5
   │  └─ Total API calls: 2,450
   │  └─ Avg storage: 30 MB
   ├─ Calculate costs:
   │  ├─ Storage: 0.030 GB × 28 × ₹0.25 = ₹0.21
   │  ├─ API: 2,450 × ₹0.001 = ₹2.45
   │  ├─ Subtotal: ₹2.66
   │  ├─ Deduct free tier:
   │  │  ├─ Free storage: 1 GB × 28 × ₹0.25 = ₹7.00
   │  │  ├─ Free API: 1,000 × ₹0.001 = ₹1.00
   │  ├─ Billable: ₹2.66 - ₹8.00 = ₹0 (covered)
   │  └─ Forecast if continues: ₹1.52
   └─ Respond: costs + forecast + breakdown
   
4. React receives & displays:
   ├─ "Storage Cost: ₹0.00"
   ├─ "API Cost: ₹2.45"
   ├─ "Free tier: ₹8.00 saved"
   ├─ "Total Due: ₹0.00"
   ├─ "Forecast: ₹1.52 if continues"
   └─ Shows: Day 28/28, usage bar, charts

---

DAY 1 OF NEXT MONTH - AUTOMATIC INVOICE:

(Happens automatically at 2 AM - user doesn't need to do anything)

1. Celery Beat wakes up at 2 AM
   ├─ Checks: Is today 1st of month? YES
   └─ Sends: generate_all_invoices task to Redis queue
   
2. Celery Worker picks task from Redis queue:
   ├─ Executes: generate_all_invoices()
   ├─ For each user (45 total):
   │  ├─ Check: Invoice exists for Feb 2026? NO
   │  ├─ Query: UsageLog for Feb 1-28
   │  ├─ Calculate: Bill amount
   │  ├─ Create: Invoice record in SQLite
   │  │  └─ month=February 2026, amount=₹1.45, status=pending
   │  ├─ Send: Email to user@example.com
   │  │  └─ Subject: "BillFlow Invoice — February 2026"
   │  │  └─ Body: "Your bill is ₹1.45"
   │  └─ Log: ✓ Invoice created
   │
   └─ Task completes: SUCCESS
   
3. Flower Dashboard shows:
   ├─ Task: generate_all_invoices
   ├─ Status: SUCCESS ✓
   ├─ Runtime: 2.4 seconds
   └─ Result: {generated: 45, failed: 0}
   
4. User wakes up in morning:
   ├─ Email in inbox: "Your invoice is ready"
   ├─ Opens BillFlow: Billing page shows new invoice
   ├─ Downloads: PDF invoice
   ├─ Clicks: "Mark as Paid"
   └─ Invoice status changes: PAID ✓

---

ADMIN FEATURES:

1. Admin logs in
   ├─ Gets JWT token with role="admin"
   └─ NavBar shows admin-only tabs
   
2. Admin visits: /admin/users
   Flask returns: All 45 users with stats
   ├─ johnDoe: 32 MB storage, 2,450 API calls, ₹1.45 billed
   ├─ alice: 48 MB storage, 5,890 API calls, ₹4.20 billed
   └─ ...
   
3. Admin can:
   ├─ Promote user to admin: PUT /api/admin/users/5/role
   ├─ View all invoices: GET /api/admin/invoices
   ├─ Mark invoice paid: POST /api/admin/invoices/42/pay
   ├─ View platform stats: GET /api/admin/overview
   │  └─ Total users, revenue, storage used
   └─ Manually trigger tasks: POST /api/tasks/generate-invoices
```

---

# 5. PROJECT STRUCTURE (File Organization)

```
setu-billing-engine/
│
├── README.md                  ← Quick start guide
├── WORKFLOWS.md              ← Detailed workflow diagrams
├── docker-compose.yml        ← Orchestrate 7 services
├── .env.example              ← Environment variables template
│
├── BACKEND (Python/Flask)
│
├── backend/
│   ├── app.py               ← Main Flask application
│   ├── config.py            ← Configuration (database, JWT, etc.)
│   ├── models.py            ← Database models (User, Invoice, etc.)
│   ├── celery_app.py        ← Celery configuration
│   ├── tasks.py             ← Background job implementations
│   ├── create_admin.py      ← Script to create first admin user
│   ├── requirements.txt      ← Python dependencies
│   ├── Dockerfile           ← Docker build instructions
│   ├── .dockerignore        ← Exclude files from Docker
│   │
│   ├── routes/              ← API endpoints
│   │   ├── auth.py          ← /api/register, /api/login, /api/profile
│   │   ├── objects.py       ← /api/objects/* (file operations)
│   │   ├── usage.py         ← /api/usage/* (tracking)
│   │   ├── billing.py       ← /api/billing/* (invoices)
│   │   ├── admin.py         ← /api/admin/* (management)
│   │   └── tasks.py         ← /api/tasks/* (manual triggers)
│   │
│   ├── services/            ← Business logic
│   │   ├── minio_service.py ← Upload/download files from MinIO
│   │   ├── usage_service.py ← Track API calls and storage
│   │   └── billing_service.py ← Calculate costs, create invoices
│   │
│   ├── utils/
│   │   └── validators.py    ← File validation (size, extension)
│   │
│   └── tests/               ← Test cases (28 total)
│       ├── conftest.py      ← Test fixtures and setup
│       ├── test_auth.py     ← 9 authentication tests
│       ├── test_usage_billing.py ← 10 billing tests
│       ├── test_admin.py    ← 7 admin tests
│       └── test_storage.py  ← 4 storage tests
│
├── FRONTEND (React/JavaScript)
│
├── frontend/
│   ├── public/
│   │   └── index.html       ← Main HTML file
│   │
│   ├── src/
│   │   ├── index.css        ← Tailwind CSS imports
│   │   ├── App.jsx          ← Main React component (routing)
│   │   │
│   │   ├── pages/           ← Full-page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx  ← Home with stats
│   │   │   ├── Files.jsx      ← File manager
│   │   │   ├── Usage.jsx      ← Charts
│   │   │   ├── Billing.jsx    ← Invoice page
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminInvoices.jsx
│   │   │   └── AdminTasks.jsx
│   │   │
│   │   ├── components/      ← Reusable components
│   │   │   ├── Navbar.jsx   ← Navigation
│   │   │   ├── UploadZone.jsx
│   │   │   ├── DeleteModal.jsx
│   │   │   └── StorageBar.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js       ← Axios client (HTTP requests)
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx ← Global auth state
│   │   │
│   │   └── utils/
│   │       ├── fileHelpers.js  ← Format file sizes, dates
│   │       └── generatePDF.js  ← Create PDF invoices
│   │
│   ├── package.json         ← Node.js dependencies
│   ├── tailwind.config.js   ← Tailwind configuration
│   ├── Dockerfile           ← Docker build
│   ├── nginx.conf           ← Nginx reverse proxy config
│   ├── .env.production      ← Production variables
│   └── .dockerignore        ← Exclude from Docker
│
└── docs/                    ← Additional documentation
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

---

# 6. STEP-BY-STEP WORKFLOW

## Workflow 1: User Registration

```
Step 1: User opens browser
        └─ Navigates to http://localhost:3000

Step 2: React loads Register page
        ├─ Shows form with fields:
        │  ├─ Username input
        │  ├─ Email input
        │  ├─ Password input
        │  └─ Register button

Step 3: User fills form & clicks Register
        ├─ username: johndoe
        ├─ email: john@example.com
        └─ password: Pass@1234

Step 4: React validates (client-side)
        ├─ Password length >= 8? ✓
        ├─ Email format valid? ✓
        └─ Prepares: FormData

Step 5: React sends HTTP POST request
        ├─ URL: /api/register
        ├─ Body: {username, email, password}
        └─ No headers needed (no token yet)

Step 6: Nginx receives request
        ├─ Port 3000 → Nginx:80
        └─ Routes /api/* → http://backend:5000

Step 7: Flask receives request at /api/register
        ├─ Extract: {username, email, password}
        ├─ Validate: Username not taken?
        │  └─ Query: SELECT * FROM users WHERE username='johndoe'
        │  └─ Result: Not found ✓
        ├─ Validate: Email not used?
        │  └─ Query: SELECT * FROM users WHERE email='john@...'
        │  └─ Result: Not found ✓
        ├─ Validate: Password strong?
        │  └─ Length >= 8, has uppercase, lowercase, numbers? ✓
        ├─ Hash password: bcrypt(Pass@1234, salt_rounds=10)
        │  └─ Result: $2b$10$abcdef...xyz (128 chars)
        ├─ Create User record:
        │  ├─ INSERT INTO users VALUES (
        │  │    id=NULL (auto),
        │  │    username='johndoe',
        │  │    email='john@example.com',
        │  │    password='$2b$10$...',
        │  │    role='user',
        │  │    created_at=NOW()
        │  │  )
        │  └─ Result: user.id = 5 (assigned)
        ├─ Create MinIO bucket:
        │  ├─ Bucket name: user-johndoe
        │  ├─ Permissions: Private (only user 5 can access)
        │  └─ Result: Bucket created ✓
        ├─ Create UsageLog entry:
        │  ├─ INSERT INTO usage_log VALUES (
        │  │    user_id=5,
        │  │    date=TODAY(),
        │  │    api_calls=1,
        │  │    storage_used=0
        │  │  )
        │  └─ Tracks that registration was 1 API call
        ├─ Create JWT token:
        │  ├─ Algorithm: HS256
        │  ├─ Header: {alg: "HS256", typ: "JWT"}
        │  ├─ Payload: {sub: 5, role: "user", exp: NOW+15min}
        │  ├─ Signature: HMAC-SHA256(header+payload, SECRET_KEY)
        │  └─ Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        └─ Respond: {
             token: "eyJhbGc...",
             username: "johndoe",
             user_id: 5,
             role: "user"
           }

Step 8: React receives response
        ├─ Check: Status 201 (Created)? ✓
        ├─ Save token: localStorage.setItem('token', '...')
        ├─ Extract: user_id=5, role='user'
        ├─ Store in Context: AuthContext
        ├─ Redirect: window.location = '/login' or '/dashboard'
        └─ Show: "Registration successful!"

Step 9: User can now login
        ├─ Token stored in localStorage
        ├─ Token automatically sent with every request
        └─ Authorization: Bearer eyJhbGc...
```

---

## Workflow 2: File Upload

```
Step 1: User is logged in
        ├─ Has token in localStorage
        └─ React includes with every request

Step 2: User clicks File Manager page
        ├─ React shows UploadZone component
        ├─ Shows: "Drag and drop file here"
        ├─ Or: Click to select file
        └─ Shows storage bar: "0 MB / 50 MB"

Step 3: User drags file: project.pdf (2 MB)
        ├─ React shows: Drop file here (highlighted)

Step 4: User drops file
        ├─ UploadZone catches: onDrop event
        ├─ Extracts file from event
        ├─ Shows progress bar: 0%

Step 5: React validates file (client-side)
        ├─ Extract extension: .pdf
        ├─ Check whitelist: ALLOWED_EXT = {jpg, png, pdf, ...}
        ├─ .pdf in list? ✓
        ├─ Get file size: 2,097,152 bytes (2 MB)
        ├─ Check: 2 MB < 10 MB? ✓
        ├─ Prepare: FormData
        │  └─ file: <binary file content>
        │  └─ metadata: {filename: 'project.pdf', size: 2097152}
        └─ Ready to upload

Step 6: React sends POST request
        ├─ URL: /api/objects/upload
        ├─ Headers: Authorization: Bearer eyJhbGc...
        ├─ Body: FormData (multipart/form-data)
        └─ Shows progress bar: 50%

Step 7: Nginx receives request
        ├─ Route: /api/objects/upload → http://backend:5000
        └─ Forward request

Step 8: Flask middleware logs API call
        ├─ Function: log_api_call(user_id)
        ├─ Query: SELECT * FROM usage_log WHERE user_id=5 AND date=TODAY()
        ├─ Found? YES
        ├─ Update: usage_log.api_calls += 1
        │  └─ (2 → 3)
        └─ Commit to database

Step 9: Flask route /api/objects/upload executes
        ├─ Decorator: @jwt_required()
        ├─ Validates: Is Authorization header present?
        │  └─ Header: "Bearer eyJhbGc..." ✓
        ├─ Validates: Is token valid? (signature matches)
        │  └─ Verify: HMAC-SHA256(...) == signature ✓
        ├─ Validates: Is token expired?
        │  └─ Check: exp claim > current_time ✓
        ├─ Extracts: user_id = 5 from token
        │
        ├─ Get user from database:
        │  ├─ Query: SELECT * FROM users WHERE id=5
        │  └─ Result: User(id=5, username='johndoe')
        │
        ├─ Validate file:
        │  ├─ Is file present? ✓
        │  ├─ Extension check:
        │  │  ├─ Extract: .pdf
        │  │  ├─ Check whitelist: {jpg, png, pdf, ...}
        │  │  └─ In list? ✓
        │  ├─ Check blocked list:
        │  │  ├─ Blocked: {exe, bat, sh, php, py, ...}
        │  │  └─ .pdf in blocked? ✗ OK
        │  ├─ Size check:
        │  │  ├─ Get: file.size = 2097152
        │  │  ├─ Max: 10 MB = 10485760
        │  │  └─ 2097152 < 10485760? ✓
        │  └─ Path traversal check:
        │     ├─ Check: ../ or ..\ in filename?
        │     ├─ Check: /etc or absolute paths?
        │     └─ Safe? ✓
        │
        ├─ Check user quota:
        │  ├─ Get total used:
        │  │  └─ Query MinIO: SUM(all file sizes in user-johndoe bucket)
        │  │  └─ Result: 1,048,576 bytes (1 MB used)
        │  ├─ Calculate available: 50 MB - 1 MB = 49 MB
        │  ├─ File size: 2 MB
        │  ├─ 2 MB < 49 MB available? ✓
        │  └─ Quota check passed
        │
        ├─ Upload to MinIO:
        │  ├─ Bucket: user-johndoe
        │  ├─ Key: project.pdf
        │  ├─ Content: <binary file>
        │  ├─ Content-type: application/pdf
        │  ├─ MinIO stores on disk
        │  └─ Response: ✓ Uploaded
        │
        ├─ Create database record:
        │  ├─ CREATE: StorageObject(
        │  │    user_id=5,
        │  │    filename='project.pdf',
        │  │    file_size=2097152,
        │  │    content_type='application/pdf',
        │  │    uploaded_at=NOW()
        │  │  )
        │  └─ Save to database
        │
        ├─ Update storage snapshot:
        │  ├─ Query MinIO again: Total size in bucket
        │  ├─ Result: 3,145,728 bytes (3 MB total now)
        │  ├─ Query UsageLog for today:
        │  │  ├─ SELECT * FROM usage_log WHERE user_id=5 AND date=TODAY()
        │  │  └─ Found (same record from Step 8)
        │  ├─ Update: storage_used = 3145728
        │  └─ Commit to database
        │
        └─ Respond: {
             status: 201,
             message: "File uploaded successfully",
             filename: "project.pdf",
             size: "2.0 MB",
             timestamp: "2026-02-27T10:30:00"
           }

Step 10: React receives response
        ├─ Status: 201 ✓
        ├─ Show progress bar: 100%
        ├─ Show: ✓ "project.pdf uploaded"
        ├─ Update state: files = [..., project.pdf]
        ├─ Refresh file list:
        │  └─ GET /api/objects/list
        │     ├─ Flask returns all files for user 5
        │     └─ React displays in table
        ├─ Update storage bar:
        │  ├─ Fetch: GET /api/objects/storage
        │  ├─ Flask returns: {used: 3145728, quota: 52428800}
        │  ├─ Calculate: 3 MB / 50 MB = 6%
        │  └─ Update bar: "3 MB / 50 MB"
        ├─ Refresh usage:
        │  ├─ Fetch: GET /api/usage/today
        │  ├─ Flask returns: {api_calls: 3, storage_mb: 3}
        │  └─ Update display: "3 API calls, 3 MB used"
        └─ Success toast disappears after 3 seconds
```

---

## Workflow 3: Monthly Invoice Generation

```
Trigger Time: 1st of month at 2:00 AM

Step 1: Celery Beat wakes up
        ├─ Checks schedule from celery_app.py
        ├─ Finds: 'monthly-invoice-generation' task
        │  └─ Scheduled for: crontab(hour=2, minute=0, day_of_month=1)
        ├─ Current time: 2026-03-01 02:00:00
        ├─ Match? YES
        └─ Action: Send task to Redis queue

Step 2: Celery Beat sends task to Redis
        ├─ Create task object:
        │  ├─ task_id: abc123def456 (unique)
        │  ├─ task_name: "tasks.generate_all_invoices"
        │  ├─ args: []
        │  ├─ kwargs: {}
        │  └─ timestamp: 2026-03-01 02:00:00
        ├─ Push to Redis queue
        │  └─ redis.lpush('celery_queue', task_json)
        └─ Task now in queue

Step 3: Celery Worker polls Redis queue
        ├─ Worker always running in container
        ├─ Interval: Check queue every 0.1 seconds
        ├─ Redis: "Any tasks for me?"
        ├─ Redis: "Yes! Task abc123def456"
        ├─ Worker fetches task from queue
        └─ Status in Redis: PENDING

Step 4: Celery Worker starts executing
        ├─ Find function: tasks.generate_all_invoices
        ├─ Call function: generate_all_invoices()
        └─ Status update: STARTED

Step 5: Function executes
        ├─ Step 5.1: Query all users
        │  ├─ SELECT * FROM users WHERE role='user'
        │  └─ Result: List of 45 users
        │
        ├─ Step 5.2: For each user (loop):
        │  │
        │  ├─ User 1 (johndoe):
        │  │  ├─ Check: Does invoice exist for "February 2026"?
        │  │  │  ├─ SELECT * FROM invoices 
        │  │  │     WHERE user_id=5 AND month='February 2026'
        │  │  │  └─ Result: NOT FOUND
        │  │  │
        │  │  ├─ Calculate bill:
        │  │  │  ├─ Get usage for Feb (1-28):
        │  │  │  │  ├─ Query: SELECT SUM(api_calls), SUM(storage_used)
        │  │  │  │  │         FROM usage_log
        │  │  │  │  │         WHERE user_id=5 
        │  │  │  │  │         AND date BETWEEN '2026-02-01' AND '2026-02-28'
        │  │  │  │  ├─ Result: {api_calls: 2450, storage_used: 840000000}
        │  │  │  │  ├─ Storage avg: 840000000 / 28 = 30000000 bytes = 30 MB
        │  │  │  │  └─ Days in month: 28
        │  │  │  │
        │  │  │  ├─ Call: billing_service.calculate_bill(user_id=5, year=2026, month=2)
        │  │  │  │  ├─ Storage cost: 0.03 GB × 28 × ₹0.25 = ₹0.21
        │  │  │  │  ├─ API cost: 2450 × ₹0.001 = ₹2.45
        │  │  │  │  ├─ Free storage: 1 GB × 28 × ₹0.25 = ₹7.00
        │  │  │  │  ├─ Free API: 1000 × ₹0.001 = ₹1.00
        │  │  │  │  ├─ Billable storage: max(0, 0.21 - 7.00) = ₹0
        │  │  │  │  ├─ Billable API: max(0, 2.45 - 1.00) = ₹1.45
        │  │  │  │  └─ Total: ₹1.45
        │  │  │  │
        │  │  │  └─ Result: {
        │  │  │       storage_cost: ₹0.00,
        │  │  │       api_cost: ₹1.45,
        │  │  │       total: ₹1.45
        │  │  │     }
        │  │  │
        │  │  ├─ Create Invoice record:
        │  │  │  ├─ INSERT INTO invoices VALUES (
        │  │  │  │    id=NULL,
        │  │  │  │    user_id=5,
        │  │  │  │    month='February 2026',
        │  │  │  │    year=2026,
        │  │  │  │    month_num=2,
        │  │  │  │    avg_storage_bytes=30000000,
        │  │  │  │    total_api_calls=2450,
        │  │  │  │    days_active=28,
        │  │  │  │    storage_cost=0.00,
        │  │  │  │    api_cost=1.45,
        │  │  │  │    total_amount=1.45,
        │  │  │  │    rate_storage_per_gb_day=0.25,
        │  │  │  │    rate_api_per_call=0.001,
        │  │  │  │    status='generated',
        │  │  │  │    generated_at=NOW()
        │  │  │  │  )
        │  │  │  └─ Result: invoice.id = 42
        │  │  │
        │  │  ├─ Send email:
        │  │  │  ├─ To: john@example.com
        │  │  │  ├─ Subject: "BillFlow Invoice — February 2026"
        │  │  │  ├─ Body:
        │  │  │  │  Hi johndoe,
        │  │  │  │  Your invoice for February 2026 has been generated.
        │  │  │  │  
        │  │  │  │  Storage Cost: ₹0.00 (covered by free tier)
        │  │  │  │  API Cost:     ₹1.45
        │  │  │  │  Total Due:    ₹1.45
        │  │  │  │  
        │  │  │  │  Free tier applied: 1 GB + 1000 API calls
        │  │  │  │
        │  │  │  └─ Email sent ✓
        │  │  │
        │  │  └─ Log: "✓ Invoice #42 generated for johndoe"
        │  │
        │  ├─ User 2 (alice):
        │  │  ├─ Check invoice exists? NO
        │  │  ├─ Calculate bill: $4.20
        │  │  ├─ Create invoice
        │  │  ├─ Send email
        │  │  └─ Log: "✓ Invoice #43 generated for alice"
        │  │
        │  ├─ ... (remaining 43 users) ...
        │  │
        │  └─ END LOOP
        │
        └─ Task completed

Step 6: Celery Worker stores result in Redis
        ├─ Update Redis:
        │  ├─ task_id: abc123def456
        │  ├─ status: SUCCESS
        │  ├─ result: {
        │  │    generated: 45,
        │  │    failed: 0,
        │  │    runtime: 2.4  # seconds
        │  │  }
        │  └─ expires_in: 1 hour
        └─ Task marked as SUCCESS

Step 7: Flower dashboard shows result
        ├─ Reads from Redis
        ├─ Displays at http://localhost:5555
        ├─ Shows:
        │  ├─ Task: generate_all_invoices
        │  ├─ Status: SUCCESS ✓
        │  ├─ Submitted: 2026-03-01 02:00:00
        │  ├─ Started: 2026-03-01 02:00:01
        │  ├─ Completed: 2026-03-01 02:00:03
        │  ├─ Runtime: 2.4 seconds
        │  └─ Result: {generated: 45, failed: 0}
        │
        └─ Admin can check: "Everything ran successfully"

Step 8: Users see invoices
        ├─ User opens email next morning
        ├─ Email: "Your invoice for February is ready"
        ├─ Clicks link → Opens BillFlow
        ├─ Goes to Billing page
        ├─ Sees new invoice: "February 2026 - ₹1.45"
        ├─ Status: "Pending"
        ├─ Can download: PDF invoice
        ├─ Can mark paid: Status → "Paid"
        └─ Admin can see all invoices in /admin/invoices
```

---

# 7. INSTALLATION & RUNNING

## Easy Way (Using Docker - Recommended)

```bash
# 1. Install Docker
# Download from: https://www.docker.com/products/docker-desktop

# 2. Clone repository
git clone https://github.com/yourusername/setu-billing-engine
cd setu-billing-engine

# 3. Start everything
docker-compose up --build

# Output will show:
# billflow-frontend-1 is up
# billflow-backend-1 is up
# billflow-minio-1 is up
# billflow-redis-1 is up
# ... and so on

# 4. Create admin user (in new terminal)
docker exec -it billflow-backend python create_admin.py

# 5. Access the app
Frontend (React):         http://localhost:3000
Backend API (Flask):      http://localhost:5000
MinIO Console:            http://localhost:9001
Flower (Task Monitor):    http://localhost:5555

# 6. Login
Username: admin
Password: Admin@1234

# 7. Stop everything
docker-compose down

# 8. Clean up (remove all data)
docker-compose down -v
```

## Hard Way (Without Docker - For Learning)

```bash
# BACKEND SETUP

# 1. Install Python 3.11
# Download from: https://www.python.org/

# 2. Create virtual environment
cd backend
python -m venv zohoenv

# 3. Activate virtual environment
# On Mac/Linux:
source zohoenv/bin/activate
# On Windows:
zohoenv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Install Redis (for Celery)
# On Mac: brew install redis
# On Windows: Download from https://github.com/microsoftarchive/redis/releases
# On Linux: sudo apt-get install redis-server

# 6. Install MinIO (for storage)
# Download from: https://min.io/download

# 7. Start Redis
redis-server
# In new terminal

# 8. Start MinIO
minio server ./data
# In new terminal

# 9. Create database
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# 10. Create admin user
python create_admin.py

# 11. Start Flask server
python app.py
# Runs on http://localhost:5000

# FRONTEND SETUP (in new terminal)

# 1. Navigate to frontend
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Start React development server
npm start
# Runs on http://localhost:3000

# CELERY SETUP (in new terminal)

# 1. Start Celery Worker
cd backend
source zohoenv/bin/activate
celery -A celery_app worker --loglevel=info

# 2. Start Celery Beat (in another terminal)
cd backend
source zohoenv/bin/activate
celery -A celery_app beat --loglevel=info

# 3. Start Flower (in another terminal)
cd backend
source zohoenv/bin/activate
celery -A celery_app flower
# Access at http://localhost:5555

# Now you have 6 terminal windows:
# 1. Redis
# 2. MinIO
# 3. Flask backend
# 4. React frontend
# 5. Celery worker
# 6. Celery beat
# (+ optional 7. Flower)
```

---

# 8. UNDERSTANDING THE CODE

## Simple Code Examples

### Example 1: User Registration (Backend)

```python
# backend/routes/auth.py

from flask import request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

@app.route('/api/register', methods=['POST'])
def register():
    # 1. Get data from request
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # 2. Validate input
    if not username or not email or not password:
        return {'error': 'Missing fields'}, 400
    
    if len(password) < 8:
        return {'error': 'Password too short'}, 400
    
    # 3. Check if username exists
    if User.query.filter_by(username=username).first():
        return {'error': 'Username already taken'}, 409
    
    # 4. Hash password
    hashed_password = generate_password_hash(password)
    
    # 5. Create user
    user = User(
        username=username,
        email=email,
        password=hashed_password,
        role='user'
    )
    db.session.add(user)
    db.session.commit()
    
    # 6. Create JWT token
    access_token = create_access_token(
        identity=user.id,
        additional_claims={'role': user.role}
    )
    
    # 7. Return response
    return {
        'token': access_token,
        'user_id': user.id,
        'username': user.username,
        'role': user.role
    }, 201
```

### Example 2: File Upload (Backend)

```python
# backend/routes/objects.py

from flask import request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'jpg', 'png', 'pdf', 'txt', 'csv', 'xlsx', 'zip'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@app.route('/api/objects/upload', methods=['POST'])
@jwt_required()  # Must have valid JWT token
def upload_file():
    # 1. Extract user from JWT
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # 2. Get file from request
    file = request.files.get('file')
    
    if not file:
        return {'error': 'No file provided'}, 400
    
    # 3. Validate extension
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {'error': f'File type .{ext} not allowed'}, 415
    
    # 4. Validate file size
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if size > MAX_FILE_SIZE:
        return {'error': 'File too large'}, 413
    
    # 5. Check quota
    total_used = get_total_storage_used(user.username)
    if total_used + size > 50 * 1024 * 1024:  # 50 MB quota
        return {'error': 'Quota exceeded'}, 507
    
    # 6. Upload to MinIO
    bucket = f"user-{user.username}"
    filename = secure_filename(file.filename)
    
    minio_client.put_object(
        bucket,
        filename,
        file,
        size,
        content_type=file.content_type
    )
    
    # 7. Create database record
    obj = StorageObject(
        user_id=user.id,
        filename=filename,
        file_size=size,
        content_type=file.content_type
    )
    db.session.add(obj)
    db.session.commit()
    
    # 8. Log API call
    log_api_call(user.id)
    
    # 9. Update storage snapshot
    update_storage_snapshot(user.id, user.username)
    
    # 10. Return success
    return {
        'message': 'File uploaded',
        'filename': filename,
        'size': f'{size / (1024*1024):.1f} MB'
    }, 201
```

### Example 3: Calculate Bill (Backend)

```python
# backend/services/billing_service.py

def calculate_bill(user_id, year, month):
    """
    Calculate monthly bill for a user
    """
    
    # 1. Get dates for the month
    from datetime import date
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    
    # 2. Get usage data
    usage_logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date >= first_day,
        UsageLog.date <= last_day
    ).all()
    
    if not usage_logs:
        return None
    
    # 3. Calculate metrics
    days_in_month = (last_day - first_day).days + 1
    total_api_calls = sum(log.api_calls for log in usage_logs)
    total_storage = sum(log.storage_used for log in usage_logs)
    
    # Average storage in GB
    avg_storage_gb = (total_storage / len(usage_logs)) / (1024 ** 3)
    
    # 4. Calculate costs
    storage_cost = avg_storage_gb * days_in_month * 0.25  # ₹0.25 per GB per day
    api_cost = total_api_calls * 0.001  # ₹0.001 per API call
    
    # 5. Apply free tier
    free_storage = 1.0 * days_in_month * 0.25  # 1 GB free
    free_api = 1000 * 0.001  # 1000 calls free
    
    billable_storage = max(0, storage_cost - free_storage)
    billable_api = max(0, api_cost - free_api)
    
    total_bill = billable_storage + billable_api
    
    # 6. Return result
    return {
        'costs': {
            'storage': round(billable_storage, 2),
            'api': round(billable_api, 2),
            'total': round(total_bill, 2)
        },
        'usage': {
            'storage_gb': round(avg_storage_gb, 2),
            'api_calls': total_api_calls
        }
    }
```

### Example 4: React Login Page (Frontend)

```javascript
// frontend/src/pages/Login.jsx

import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    
    const navigate = useNavigate()
    const { login } = useAuth()
    
    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        
        try {
            // 1. Send login request to Flask
            const response = await axios.post('/api/login', {
                username,
                password
            })
            
            // 2. Extract data
            const { token, user_id, role } = response.data
            
            // 3. Save token & user info
            login({ username, user_id, role }, token)
            
            // 4. Redirect based on role
            if (role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/dashboard')
            }
            
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                
                {error && <div className="text-red-600">{error}</div>}
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    )
}
```

### Example 5: Celery Background Task (Backend)

```python
# backend/tasks.py

from celery import shared_task
from flask_mail import Message
from app import app, db, mail

@shared_task
def generate_all_invoices():
    """
    Generate invoices for all users
    This runs automatically on 1st of month at 2 AM
    """
    
    with app.app_context():
        # 1. Get all users
        users = User.query.filter_by(role='user').all()
        
        generated = 0
        failed = 0
        
        # 2. For each user
        for user in users:
            try:
                # 3. Calculate last month's bill
                from datetime import datetime, timedelta
                now = datetime.now()
                last_month = now.replace(day=1) - timedelta(days=1)
                
                # 4. Check if invoice already exists (idempotent)
                existing = Invoice.query.filter_by(
                    user_id=user.id,
                    year=last_month.year,
                    month_num=last_month.month
                ).first()
                
                if existing:
                    continue  # Skip, already generated
                
                # 5. Calculate bill
                from billing_service import calculate_bill
                result = calculate_bill(user.id, last_month.year, last_month.month)
                
                if not result:
                    continue  # No usage in month
                
                # 6. Create invoice record
                invoice = Invoice(
                    user_id=user.id,
                    year=last_month.year,
                    month_num=last_month.month,
                    month=last_month.strftime('%B %Y'),
                    storage_cost=result['costs']['storage'],
                    api_cost=result['costs']['api'],
                    total_amount=result['costs']['total'],
                    status='generated'
                )
                db.session.add(invoice)
                db.session.commit()
                
                # 7. Send email
                msg = Message(
                    subject=f"BillFlow Invoice — {invoice.month}",
                    recipients=[user.email],
                    body=f"""
                    Hi {user.username},
                    
                    Your invoice for {invoice.month} has been generated.
                    Total Amount Due: ₹{invoice.total_amount}
                    
                    Log in to BillFlow to view detailed invoice.
                    """
                )
                mail.send(msg)
                
                generated += 1
                
            except Exception as e:
                print(f"Error generating invoice for {user.username}: {str(e)}")
                failed += 1
        
        return {
            'generated': generated,
            'failed': failed,
            'total': generated + failed
        }
```

---

# 9. FAQ & COMMON QUESTIONS

## Q1: What is a JWT Token?
**Answer:**
A JWT is like a digital pass ticket. When you login:
1. Server creates ticket: "This is user 5, valid for 15 minutes"
2. Server signs ticket (so no one can forge it)
3. Server gives ticket to you
4. Every time you need something, show the ticket
5. Server checks: "Ticket valid? OK, help you"
6. After 15 minutes, ticket expires, need new one

## Q2: Why use MinIO instead of regular database for files?
**Answer:**
- Regular database: Good for small data (usernames, emails)
- File storage: Need different tool, designed for files
- MinIO: S3-compatible, scalable, supports per-bucket access control
- Per-user bucket: User A can NEVER access User B's bucket (even if system hacked)

## Q3: Why use Celery for invoicing?
**Answer:**
Without Celery:
- User clicks "Generate Invoice"
- API calculates for 45 users (takes 2 minutes)
- User waits 2 minutes
- If server crashes, invoice lost

With Celery:
- Schedule: "Generate on 1st of month"
- Celery runs at 2 AM (automatic, no human needed)
- Takes 2 seconds to queue job (user sees instant response)
- Even if crashes, job retries
- Flower shows: "Did it work?"

## Q4: Why have separate Frontend and Backend?
**Answer:**
Alternative: Single server returns HTML (old way)
```
Problem:
- Change UI → Must restart server
- Hard to scale frontend and backend separately
- Frontend breaks, entire app down
```

Our way: Separate Frontend + Backend
```
Benefits:
- Update React without touching Flask
- Scale separately (100 frontend, 10 backend)
- Frontend down, API still works
- Can deploy to different servers
- Frontend can be cached (CDN)
```

## Q5: Why Docker?
**Answer:**
Without Docker:
- Examiner needs to install: Python, Node, Redis, MinIO
- Different setup for Mac vs Windows vs Linux
- Takes 2 hours
- Usually something breaks

With Docker:
- Examiner runs: `docker-compose up`
- Everything starts in 30 seconds
- Same on any computer
- No installation headaches

## Q6: How much does this cost to run?
**Answer:**
**Local development:** FREE (on your laptop)

**Production:**
- Cheapest option (Render): ₹0/month (free tier)
- Small production (Railway): ₹500-1000/month
- Serious production (AWS): ₹2000-5000/month
- Enterprise (AWS dedicated): ₹10,000+/month

**Why different costs:**
- Uptime guarantee increases cost
- More users increases cost
- More storage increases cost
- Support/monitoring increases cost

## Q7: Can I change pricing (₹0.25/GB)?
**Answer:**
Yes! It's in config file:
```python
# backend/config.py or backend/services/billing_service.py

PRICE_STORAGE_PER_GB_DAY = 0.25  # Change this
PRICE_API_PER_CALL = 0.001       # Change this
FREE_STORAGE_GB = 1.0            # Change this
FREE_API_CALLS = 1000             # Change this
```

Change any value, everything updates automatically.

## Q8: What happens if server crashes?
**Answer:**
**Database:** Saved on disk
- Stop Docker: `docker-compose down`
- Data in SQLite file still there
- Start Docker: `docker-compose up`
- Data loads: Everything back

**Celery task:** Stored in Redis
- Task in queue: Will retry when server restarts
- Task completed: Result saved for 1 hour
- You can see status in Flower

**User files:** Stored in MinIO
- MinIO saved to disk
- If MinIO crashes, files still safe
- Restart MinIO: Files accessible

## Q9: How do I add new features?
**Answer:**
Example: Add "file sharing" feature

**Backend:**
1. Add to models: ShareLink(user_id, file_id, token)
2. Add route: `/api/objects/share` (POST)
3. Test: Add test cases

**Frontend:**
1. Add button: "Share this file"
2. Show link: "Copy this link"
3. Input field: Accept link to share

**Deploy:**
1. docker-compose down
2. Make changes
3. docker-compose up --build
4. Test

## Q10: How do I migrate to PostgreSQL?
**Answer:**
1. Install PostgreSQL locally
2. Change connection string:
```python
# From:
DATABASE_URL=sqlite:///billing.db

# To:
DATABASE_URL=postgresql://user:password@localhost/billflow
```
3. Same code works! (SQLAlchemy handles it)
4. Run migrations (if needed)
5. Done!

---

# CONCLUSION

BillFlow is a complete example of modern SaaS architecture:

✅ **Frontend:** React (beautiful UI)  
✅ **Backend:** Flask (simple, powerful API)  
✅ **Storage:** MinIO (file management)  
✅ **Jobs:** Celery (background tasks)  
✅ **Deployment:** Docker (easy, portable)  
✅ **Testing:** pytest (28 tests, 95%+ coverage)  
✅ **Monitoring:** Flower (see what's happening)  

This is how real companies build products. You now understand:
- How users register and login
- How files are uploaded safely
- How billing is calculated automatically
- How background jobs run without blocking
- How everything is containerized for easy deployment

Next steps:
1. Run locally: `docker-compose up`
2. Break it, fix it, learn
3. Add your own features
4. Deploy to production
5. Celebrate! 🎉

---

**Questions?** Ask in comments, read the code, or check WORKFLOWS.md for detailed diagrams.

**Want to learn more?**
- https://docs.flask.palletsprojects.com/
- https://react.dev/
- https://docs.celeryproject.io/
- https://docs.docker.com/
- https://docs.min.io/

Good luck! 🚀
