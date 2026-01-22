# Multi-User Scalability Guide - Beauty CRM

## Current Status: Tested for ~10-20 concurrent users

## Target: 100+ concurrent users

---

## 🚨 Critical Scalability Issues

### 1. Session Management (CRITICAL)

**Current**: In-memory sessions (FastAPI default)
**Problem**: Sessions stored in application memory, lost on restart, not shared across workers
**Impact**:

- User logged out on server restart
- Inconsistent sessions across Gunicorn workers
- Memory growth with many users

**Solution**:

```python
# Install Redis
pip install redis aioredis

# backend/config.py
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_EXPIRE_SECONDS = 86400  # 24 hours

# backend/db/sessions.py
import aioredis
from datetime import timedelta

redis_client = None

async def get_redis():
    global redis_client
    if not redis_client:
        redis_client = await aioredis.create_redis_pool(REDIS_URL)
    return redis_client

async def create_session(user_id: int, username: str, role: str) -> str:
    redis = await get_redis()
    session_id = secrets.token_urlsafe(32)
    session_data = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "created_at": datetime.now().isoformat()
    }
    await redis.setex(
        f"session:{session_id}",
        SESSION_EXPIRE_SECONDS,
        json.dumps(session_data)
    )
    return session_id

async def get_session(session_id: str) -> dict:
    redis = await get_redis()
    data = await redis.get(f"session:{session_id}")
    if data:
        return json.loads(data)
    return None

async def delete_session(session_id: str):
    redis = await get_redis()
    await redis.delete(f"session:{session_id}")
```

### 2. Database Connection Pool

**Current**: Default pool size (likely 5-10 connections)
**Problem**: Connection exhaustion with 100+ users
**Impact**: "Too many connections" errors, slow queries

**Solution**:

```python
# backend/db/database.py
from sqlalchemy.pool import QueuePool

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,              # Base connections
    max_overflow=30,           # Extra connections when needed
    pool_timeout=30,           # Wait 30s for connection
    pool_recycle=3600,         # Recycle connections every hour
    pool_pre_ping=True,        # Test connections before use
    echo=False
)
```

### 3. WebSocket Connection Limits

**Current**: Unlimited WebSocket connections
**Problem**: Each user can open multiple WS connections (chat, video, notifications)
**Impact**: Server resource exhaustion, memory leaks

**Solution**:

```python
# backend/main.py
from collections import defaultdict
from fastapi import WebSocket, WebSocketDisconnect

# Track connections per user
ws_connections = defaultdict(list)
MAX_WS_PER_USER = 5

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    # Limit connections per user
    if len(ws_connections[user_id]) >= MAX_WS_PER_USER:
        await websocket.close(code=1008, reason="Too many connections")
        return

    await websocket.accept()
    ws_connections[user_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Process message
    except WebSocketDisconnect:
        ws_connections[user_id].remove(websocket)
    finally:
        # Cleanup
        if websocket in ws_connections[user_id]:
            ws_connections[user_id].remove(websocket)
```

### 4. WebRTC Cleanup (Video Calls)

**Current**: Peer connections not properly closed
**Problem**: Camera/mic stay active after disconnect
**Impact**: Privacy issues, resource leaks

**Solution**:

```typescript
// frontend/src/components/shared/InternalChat.tsx
const cleanupCall = useCallback(() => {
  // Stop all tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop();
      localStream.removeTrack(track);
    });
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  // Close peer connection
  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
  }

  // Reset state
  setLocalStream(null);
  setRemoteStream(null);
  setPeerConnection(null);
  setIsInCall(false);
}, [localStream, remoteStream, peerConnection]);

// Call cleanup on unmount and disconnect
useEffect(() => {
  return () => {
    cleanupCall();
  };
}, [cleanupCall]);
```

### 5. API Rate Limiting

**Current**: No rate limiting
**Problem**: Abuse, DDoS vulnerability
**Impact**: Server overload, legitimate users affected

**Solution**:

```python
# Install slowapi
pip install slowapi

# backend/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to endpoints
@app.post("/api/bookings")
@limiter.limit("10/minute")  # 10 requests per minute
async def create_booking(request: Request, ...):
    pass

@app.get("/api/analytics")
@limiter.limit("30/minute")  # More for read operations
async def get_analytics(request: Request, ...):
    pass
```

### 6. File Upload Optimization

**Current**: Files saved to local disk
**Problem**: Disk I/O bottleneck, no redundancy
**Impact**: Slow uploads, data loss risk

**Solution**:

```python
# Use cloud storage (AWS S3, DigitalOcean Spaces, etc.)
pip install boto3

# backend/services/file_storage.py
import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client(
    's3',
    endpoint_url=os.getenv('S3_ENDPOINT'),
    aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
    aws_secret_access_key=os.getenv('S3_SECRET_KEY')
)

async def upload_file(file: UploadFile, folder: str = "uploads") -> str:
    """Upload file to S3 and return URL"""
    file_key = f"{folder}/{uuid.uuid4()}_{file.filename}"

    try:
        s3_client.upload_fileobj(
            file.file,
            os.getenv('S3_BUCKET'),
            file_key,
            ExtraArgs={'ACL': 'public-read'}
        )
        return f"{os.getenv('S3_CDN_URL')}/{file_key}"
    except ClientError as e:
        log_error(f"S3 upload failed: {e}", "storage")
        raise
```

### 7. Background Task Queue

**Current**: FastAPI BackgroundTasks (in-process)
**Problem**: Tasks block worker, no retry mechanism
**Impact**: Slow response times, lost tasks on crash

**Solution**:

```python
# Install Celery
pip install celery redis

# backend/celery_app.py
from celery import Celery

celery_app = Celery(
    'beauty_crm',
    broker='redis://localhost:6379/1',
    backend='redis://localhost:6379/2'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000
)

# backend/tasks/email_tasks.py
from backend.celery_app import celery_app

@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, body: str):
    try:
        # Send email
        pass
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

# Usage in API
from backend.tasks.email_tasks import send_email_task

@app.post("/api/send-notification")
async def send_notification(...):
    # Queue task instead of blocking
    send_email_task.delay(to, subject, body)
    return {"status": "queued"}
```

### 8. Database Query Optimization

**Current**: Some N+1 queries, missing indexes
**Problem**: Slow queries with large datasets
**Impact**: Page load times increase with data growth

**Solution**:

```python
# Add indexes
CREATE INDEX idx_bookings_client_date ON bookings(client_id, booking_date);
CREATE INDEX idx_bookings_employee_date ON bookings(employee_id, booking_date);
CREATE INDEX idx_chat_history_client ON chat_history(client_id, timestamp);
CREATE INDEX idx_sessions_user ON sessions(user_id, created_at);
CREATE INDEX idx_call_logs_client ON call_logs(client_id, call_time);

# Use eager loading
from sqlalchemy.orm import joinedload

# Bad: N+1 query
bookings = session.query(Booking).all()
for booking in bookings:
    print(booking.client.name)  # Separate query for each!

# Good: Single query with join
bookings = session.query(Booking).options(
    joinedload(Booking.client),
    joinedload(Booking.employee),
    joinedload(Booking.service)
).all()
```

### 9. Caching Strategy

**Current**: No caching
**Problem**: Repeated expensive queries
**Impact**: Unnecessary database load

**Solution**:

```python
# Install cachetools
pip install cachetools

from cachetools import TTLCache, cached
from functools import wraps

# Cache for 5 minutes
cache = TTLCache(maxsize=1000, ttl=300)

@cached(cache)
def get_salon_settings():
    """Cached salon settings"""
    return db.query(SalonSettings).first()

# For async functions
from aiocache import cached as async_cached

@async_cached(ttl=300)
async def get_active_services():
    """Cached active services list"""
    return await db.query(Service).filter(Service.is_active == 1).all()
```

### 10. Monitoring & Alerts

**Current**: Basic logging
**Problem**: No visibility into performance issues
**Impact**: Problems discovered too late

**Solution**:

```python
# Install prometheus client
pip install prometheus-client

# backend/monitoring.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
active_users = Gauge('active_users_total', 'Number of active users')
db_connections = Gauge('db_connections_active', 'Active database connections')

# Middleware to track metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

---

## 📊 Load Testing

### Test with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class BeautyCRMUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login
        response = self.client.post("/api/login", json={
            "username": "testuser",
            "password": "testpass"
        })
        self.token = response.json()["token"]

    @task(3)
    def view_dashboard(self):
        self.client.get("/api/dashboard", headers={
            "Authorization": f"Bearer {self.token}"
        })

    @task(2)
    def view_bookings(self):
        self.client.get("/api/bookings", headers={
            "Authorization": f"Bearer {self.token}"
        })

    @task(1)
    def create_booking(self):
        self.client.post("/api/bookings", json={
            "client_id": 1,
            "service_id": 1,
            "booking_date": "2026-01-23 10:00:00"
        }, headers={
            "Authorization": f"Bearer {self.token}"
        })

# Run test
# locust -f locustfile.py --users 100 --spawn-rate 10 --host http://localhost:8000
```

---

## 🚀 Deployment Checklist for 100+ Users

- [ ] Migrate sessions to Redis
- [ ] Increase database connection pool (20 base + 30 overflow)
- [ ] Implement WebSocket connection limits (5 per user)
- [ ] Add API rate limiting (per endpoint)
- [ ] Move file uploads to S3/cloud storage
- [ ] Set up Celery for background tasks
- [ ] Add database indexes for common queries
- [ ] Implement caching for expensive queries
- [ ] Set up Prometheus monitoring
- [ ] Configure Nginx with:
  - [ ] Gzip compression
  - [ ] Static file caching
  - [ ] Connection limits
  - [ ] Request buffering
- [ ] Increase Gunicorn workers (2 \* CPU cores + 1)
- [ ] Set up log rotation
- [ ] Configure automatic backups
- [ ] Set up health check endpoint
- [ ] Configure auto-restart on failure
- [ ] Load test with 100+ concurrent users
- [ ] Set up alerts for:
  - [ ] High CPU usage (>80%)
  - [ ] High memory usage (>80%)
  - [ ] Slow queries (>1s)
  - [ ] High error rate (>1%)
  - [ ] Database connection pool exhaustion

---

## 📈 Expected Performance After Optimization

| Metric                | Before    | After  | Target    |
| --------------------- | --------- | ------ | --------- |
| Concurrent Users      | 10-20     | 100+   | 200+      |
| Response Time (p95)   | 500ms     | 200ms  | <300ms    |
| Database Connections  | 5-10      | 20-50  | <50       |
| Memory Usage          | 500MB     | 1-2GB  | <2GB      |
| CPU Usage             | 20-40%    | 40-60% | <70%      |
| WebSocket Connections | Unlimited | 5/user | 500 total |

---

## 🔍 Monitoring Dashboards

### Key Metrics to Track

1. **Request Rate**: Requests per second
2. **Response Time**: p50, p95, p99 latencies
3. **Error Rate**: 4xx and 5xx errors
4. **Active Users**: Currently logged in
5. **Database**: Query time, connection pool usage
6. **Memory**: Application memory usage
7. **CPU**: CPU utilization
8. **WebSocket**: Active connections
9. **Cache**: Hit rate, miss rate
10. **Queue**: Background task queue length

---

## 🛠 Maintenance Tasks

### Daily

- Check error logs
- Monitor disk space
- Review slow query log

### Weekly

- Analyze performance metrics
- Review and optimize slow endpoints
- Check database index usage
- Clean up old sessions/logs

### Monthly

- Load testing
- Security audit
- Dependency updates
- Backup verification
- Capacity planning review
