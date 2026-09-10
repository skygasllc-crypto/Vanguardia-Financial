> **Superseded — see [DEPLOY.md](DEPLOY.md).**
>
> This guide predates the current setup and describes a deployment that will
> not work: the API runs a persistent background engine (price polling, margin
> stop-outs, equity snapshots) which a serverless Python runtime cannot keep
> alive, and the frontend is a static export with no server to start. Kept for
> reference only.

# 🚀 Quick Deploy Guide

Deploy your entire app in 15 minutes!

---

## **Option 1: Railway (Easiest)** ⭐ **RECOMMENDED**

### **Cost**: $5/month for everything

### **Steps:**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Create new project
railway init

# 4. Deploy backend
cd backend
railway up
cd ..

# 5. Deploy frontend
cd frontend-next
railway up
cd ..

# Done! ✅
```

**Or use the web interface:**

1. Go to https://railway.app
2. Click "New Project"
3. "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects and deploys both apps
6. Add PostgreSQL database (one click)

---

## **Option 2: Render (FREE)** 💰

### **Cost**: FREE (with limitations)

### **One-Click Deploy:**

1. Push your code to GitHub with `render.yaml` file ✅ (already created)

2. Go to https://render.com

3. Click "New" → "Blueprint"

4. Connect your GitHub repository

5. Click "Apply"

6. Render deploys:
   - ✅ Backend (Python/FastAPI)
   - ✅ Frontend (Next.js)
   - ✅ PostgreSQL database
   - ✅ Redis cache

**That's it!** 🎉

---

## **Option 3: Railway via GitHub**

### **Easiest Method** (No CLI needed)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/vanguardia-financial.git
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project"
   - "Deploy from GitHub repo"
   - Select `vanguardia-financial`
   - Railway auto-detects both services

3. **Add Services:**

   **Backend:**
   - Click "+ New" → "GitHub Repo"
   - Root directory: `backend`
   - Add environment variables (see below)

   **Frontend:**
   - Click "+ New" → "GitHub Repo"
   - Root directory: `frontend-next`
   - Add environment variables (see below)

   **Database:**
   - Click "+ New" → "Database" → "PostgreSQL"

4. **Environment Variables:**

   **Backend:**
   ```
   DATABASE_URL = [auto-provided by Railway]
   SECRET_KEY = [generate random string]
   JWT_SECRET_KEY = [generate random string]
   CORS_ORIGINS = https://your-frontend-url.railway.app
   ```

   **Frontend:**
   ```
   NEXT_PUBLIC_API_BASE_URL = https://your-backend-url.railway.app
   NEXT_PUBLIC_SITE_URL = https://your-frontend-url.railway.app
   ```

5. **Done!** ✅

**You'll get URLs like:**
- Frontend: `https://vanguardia-frontend-production.up.railway.app`
- Backend: `https://vanguardia-backend-production.up.railway.app`

---

## **After Deployment**

### **Run Database Migrations:**

**On Railway:**
```bash
railway run alembic upgrade head
```

**Or in Railway dashboard:**
1. Open backend service
2. Click "Shell"
3. Run: `alembic upgrade head`

### **Test Your Site:**

Visit your frontend URL and test:
- ✅ Homepage loads
- ✅ Markets page shows cryptocurrency data
- ✅ User registration works
- ✅ Login works
- ✅ Trading interface loads

---

## **Add Custom Domain**

### **1. Buy Domain** (Namecheap: ~$12/year)

### **2. Configure Railway:**

**Frontend:**
1. Go to frontend service
2. Settings → Domains
3. "Add Custom Domain"
4. Enter: `vanguardiafinancial.com`
5. Railway provides CNAME record

**Backend (API subdomain):**
1. Go to backend service
2. Settings → Domains
3. "Add Custom Domain"
4. Enter: `api.vanguardiafinancial.com`
5. Railway provides CNAME record

### **3. Update DNS (Namecheap):**

Add these CNAME records:

```
Type: CNAME
Host: @
Value: your-frontend.railway.app
TTL: Auto

Type: CNAME
Host: api
Value: your-backend.railway.app
TTL: Auto
```

### **4. Update Environment Variables:**

**Backend:**
```
CORS_ORIGINS = https://vanguardiafinancial.com
```

**Frontend:**
```
NEXT_PUBLIC_API_BASE_URL = https://api.vanguardiafinancial.com
NEXT_PUBLIC_SITE_URL = https://vanguardiafinancial.com
```

### **5. Wait for DNS** (5-60 minutes)

SSL certificates are auto-generated!

---

## **Continuous Deployment**

After initial setup, just push to GitHub:

```bash
git add .
git commit -m "New feature"
git push origin main
```

✅ **Auto-deploys to Railway/Render**
✅ **Zero downtime**
✅ **Automatic rollback on errors**

---

## **Generate Secret Keys**

For `SECRET_KEY` and `JWT_SECRET_KEY`:

```bash
# Method 1: Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 2: OpenSSL
openssl rand -base64 32

# Method 3: Online
# https://randomkeygen.com
```

---

## **Troubleshooting**

### **Frontend can't connect to backend:**
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Check backend `CORS_ORIGINS` includes frontend URL
- Check backend is running (visit `/api/health`)

### **Database connection error:**
- Check `DATABASE_URL` is set
- Run migrations: `railway run alembic upgrade head`

### **Build fails:**
- Check build logs in Railway/Render dashboard
- Ensure `requirements.txt` and `package.json` are correct

---

## **Monitoring**

### **Railway:**
- Dashboard → Metrics (CPU, Memory, Network)
- Dashboard → Logs (Real-time)
- Dashboard → Deployments (History)

### **Render:**
- Dashboard → Metrics
- Dashboard → Logs
- Email alerts on failures

---

## **Cost Comparison**

| Platform | Frontend | Backend | Database | Total/month |
|----------|----------|---------|----------|-------------|
| **Railway** | Included | Included | Included | **$5** |
| **Render** | Free* | Free* | Free* | **$0** (or $7) |
| **Vercel + Railway** | Free | $5 | Included | **$5** |

*Render free tier sleeps after 15 minutes of inactivity

---

## **Recommended Setup**

```
Domain:     Namecheap ($12/year)
Frontend:   Railway (included in $5)
Backend:    Railway (included in $5)
Database:   Railway (included in $5)
Total:      $5/month + $12/year domain
```

---

## **Need Help?**

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Discord**: https://discord.gg/railway

---

**That's it! Your app is live!** 🎉🚀
