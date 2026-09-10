> **Superseded — see [DEPLOY.md](DEPLOY.md).**
>
> This guide predates the current setup and describes a deployment that will
> not work: the API runs a persistent background engine (price polling, margin
> stop-outs, equity snapshots) which a serverless Python runtime cannot keep
> alive, and the frontend is a static export with no server to start. Kept for
> reference only.

# Monorepo Deployment Guide

Deploy both frontend and backend together from a single repository.

---

## **Best Options for Monorepo Deployment**

### **Option 1: Railway (Easiest)** ⭐ **RECOMMENDED**

Railway can deploy multiple services from one repository!

#### **Cost**: $5/month (both apps)

#### **Steps:**

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/vanguardia-financial.git
   git push -u origin main
   ```

2. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

3. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

4. **Add Backend Service**
   - Click "+ New"
   - Select "GitHub Repo"
   - Root Directory: `backend`
   - Railway auto-detects Python
   - Add environment variables:
     ```env
     DATABASE_URL=<auto-provided>
     SECRET_KEY=your-secret-key
     JWT_SECRET_KEY=your-jwt-secret
     CORS_ORIGINS=https://your-frontend.railway.app
     ```

5. **Add Frontend Service**
   - In same project, click "+ New"
   - Select "GitHub Repo"
   - Root Directory: `frontend-next`
   - Railway auto-detects Next.js
   - Add environment variable:
     ```env
     NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
     ```

6. **Add PostgreSQL**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-links to backend

**Done!** ✅ Both services deployed from one repo.

**URLs you'll get:**
- Frontend: `https://vanguardia-frontend.railway.app`
- Backend: `https://vanguardia-backend.railway.app`

---

### **Option 2: Render (Free Tier Available)**

Render supports monorepo deployments with a `render.yaml` file.

#### **Cost**: Free (or $7/month for always-on)

#### **Setup:**

Create `render.yaml` in your repo root:

```yaml
services:
  # Backend API
  - type: web
    name: vanguardia-backend
    env: python
    region: oregon
    buildCommand: "cd backend && pip install -r requirements.txt"
    startCommand: "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: vanguardia-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: CORS_ORIGINS
        value: https://vanguardia-financial.onrender.com
    healthCheckPath: /api/health

  # Frontend
  - type: web
    name: vanguardia-frontend
    env: node
    region: oregon
    buildCommand: "cd frontend-next && npm install && npm run build"
    startCommand: "cd frontend-next && npm start"
    envVars:
      - key: NEXT_PUBLIC_API_BASE_URL
        value: https://vanguardia-backend.onrender.com
      - key: NEXT_PUBLIC_SITE_URL
        value: https://vanguardia-financial.onrender.com

# Database
databases:
  - name: vanguardia-db
    databaseName: vanguardia
    user: vanguardia
    region: oregon
```

**Steps:**
1. Push code to GitHub with `render.yaml`
2. Go to https://render.com
3. "New" → "Blueprint"
4. Connect GitHub repo
5. Render deploys everything automatically

---

### **Option 3: DigitalOcean App Platform**

Deploy entire monorepo with one click.

#### **Cost**: ~$17/month (both apps + database)

#### **Steps:**

1. **Push to GitHub**

2. **Create App**
   - Go to https://cloud.digitalocean.com/apps
   - "Create App"
   - Connect GitHub repo

3. **Configure Components**
   DigitalOcean auto-detects both:
   - **Backend** (Python in `/backend`)
   - **Frontend** (Next.js in `/frontend-next`)

4. **Add Database**
   - "Add Resource" → "Database"
   - PostgreSQL
   - Auto-links to backend

5. **Set Environment Variables**

   **Backend:**
   ```env
   DATABASE_URL=${db.DATABASE_URL}
   SECRET_KEY=your-secret
   JWT_SECRET_KEY=your-jwt-secret
   CORS_ORIGINS=${frontend.PUBLIC_URL}
   ```

   **Frontend:**
   ```env
   NEXT_PUBLIC_API_BASE_URL=${backend.PUBLIC_URL}
   ```

**Done!** Everything deployed together.

---

### **Option 4: Docker Compose (Self-Hosted)**

Run everything with one command using Docker.

#### **Create `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: vanguardia
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: vanguardia
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vanguardia"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://vanguardia:changeme@db:5432/vanguardia
      SECRET_KEY: your-secret-key-change-this
      JWT_SECRET_KEY: your-jwt-secret-change-this
      CORS_ORIGINS: http://localhost:3000,https://yourdomain.com
      REDIS_URL: redis://redis:6379
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  # Redis (for sessions/cache)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Frontend
  frontend:
    build:
      context: ./frontend-next
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### **Frontend Dockerfile:**

Create `frontend-next/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### **Deploy:**

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: localhost:5432

---

## **Comparison Table**

| Platform | Cost | Ease | Database | Auto-Deploy | Best For |
|----------|------|------|----------|-------------|----------|
| **Railway** | $5/mo | ⭐⭐⭐⭐⭐ | ✅ Included | ✅ Yes | Startups |
| **Render** | Free-$7 | ⭐⭐⭐⭐ | ✅ Included | ✅ Yes | Side projects |
| **DigitalOcean** | $17/mo | ⭐⭐⭐⭐ | ✅ Managed | ✅ Yes | Growing apps |
| **Docker** | VPS cost | ⭐⭐⭐ | 🔧 Self-host | ❌ Manual | Full control |

---

## **Recommended: Railway Monorepo Setup**

### **Quick Start:**

```bash
# 1. Initialize git (if not already)
cd /mnt/c/Users/User/Desktop/Vanguard-Trading
git init
git add .
git commit -m "Initial commit"

# 2. Create GitHub repo and push
git remote add origin https://github.com/yourusername/vanguardia-financial.git
git push -u origin main

# 3. Go to Railway
# - https://railway.app
# - New Project → Deploy from GitHub
# - Select your repo
# - Add backend service (root: backend/)
# - Add frontend service (root: frontend-next/)
# - Add PostgreSQL database
# - Done!
```

### **Environment Variables:**

**Backend (Railway):**
```env
DATABASE_URL=postgresql://... (auto-provided by Railway)
SECRET_KEY=generate-a-secure-random-string
JWT_SECRET_KEY=generate-another-secure-string
CORS_ORIGINS=https://your-frontend.railway.app
COINGECKO_API_KEY=your-key-if-you-have-one
```

**Frontend (Railway):**
```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
NEXT_PUBLIC_SITE_URL=https://your-frontend.railway.app
```

---

## **Custom Domain Setup**

After deployment, point your domain to Railway:

### **1. Buy Domain** (Namecheap, $12/year)

### **2. Add to Railway:**
- Go to your frontend service
- Settings → Domains
- Add custom domain: `vanguardiafinancial.com`
- Railway provides DNS records

### **3. Update Namecheap DNS:**
```
Type: CNAME
Host: @
Value: your-app.railway.app
TTL: Automatic
```

### **4. Update Environment Variables:**

**Backend:**
```env
CORS_ORIGINS=https://vanguardiafinancial.com
```

**Frontend:**
```env
NEXT_PUBLIC_API_BASE_URL=https://api.vanguardiafinancial.com
NEXT_PUBLIC_SITE_URL=https://vanguardiafinancial.com
```

---

## **Continuous Deployment**

Once set up, just push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

✅ Railway/Render/DigitalOcean auto-deploys
✅ Zero downtime deployments
✅ Automatic rollback on failure

---

## **Monitoring & Logs**

### **Railway:**
- Built-in metrics dashboard
- Real-time logs
- Resource usage graphs

### **Render:**
- Logs dashboard
- Health check monitoring
- Email alerts

### **DigitalOcean:**
- App metrics
- Database metrics
- Alert policies

---

## **Database Migrations**

Run migrations after first deployment:

```bash
# Railway CLI
railway run alembic upgrade head

# Or in Railway dashboard
# Open backend shell → run:
alembic upgrade head
```

---

## **Cost Breakdown**

### **Railway (Recommended):**
- Frontend: $2.50/mo
- Backend: $2.50/mo
- PostgreSQL: Included
- **Total: $5/month**

### **Render (Free):**
- Frontend: Free
- Backend: Free (sleeps after 15min)
- PostgreSQL: Free
- **Total: $0/month** (or $7 for always-on)

### **DigitalOcean:**
- Frontend: $5/mo
- Backend: $5/mo
- PostgreSQL: $7/mo
- **Total: $17/month**

---

## **My Recommendation**

**Start with Railway:**
1. ✅ Easiest setup (30 minutes)
2. ✅ Affordable ($5/month)
3. ✅ Everything in one place
4. ✅ Great performance
5. ✅ PostgreSQL included
6. ✅ Auto-deploy from GitHub

**Deploy to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

**Done!** 🚀
