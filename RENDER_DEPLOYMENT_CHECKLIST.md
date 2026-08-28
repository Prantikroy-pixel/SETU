# SETU Render Deployment Checklist

This document provides a complete checklist for deploying SETU to Render with frontend, backend, and database all in one place.

---

## ✅ Pre-Deployment Verification

### Repository Setup
- [x] GitHub repository cloned locally: `/Users/prantikroy/SETU`
- [x] Repository URL: `https://github.com/Prantikroy-pixel/SETU.git`
- [x] Branch: `main` (or your default branch)

### Backend Configuration
- [x] `backend/config/settings.py` — Updated for Render compatibility
  - Detects `RENDER=true` environment variable
  - Uses PostgreSQL via `DATABASE_URL`
  - Supports HTTPS proxy headers
  - CORS configured for `.onrender.com` domains
- [x] `backend/requirements.txt` — Contains all dependencies
  - Django 5.1
  - djangorestframework 3.15
  - psycopg2-binary (PostgreSQL driver)
  - gunicorn (WSGI server)
  - dj-database-url (PostgreSQL URL parsing)
  - python-dotenv (environment loading)
- [x] `backend/build.sh` — Executable build script
- [x] `backend/.env.example` — Created for reference

### Frontend Configuration
- [x] `Frontend/package.json` — Contains build script
  - `"build": "vite build"` compiles to `Frontend/dist`
  - All dependencies properly defined
- [x] `Frontend/src/api.js` — Uses relative API paths
  - `VITE_API_URL` defaults to empty string
  - Will use `/api/*` which Render routes to backend
- [x] `Frontend/vite.config.js` — Proper build configuration

### Render Configuration
- [x] `render.yaml` — Updated with both frontend and backend
  - Frontend service: static React app
  - Backend service: Python Django API
  - PostgreSQL database (free tier)
  - Environment variables configured
  - Build & start commands specified

---

## 🚀 Deployment Steps

### Step 1: Prepare GitHub Repository
```bash
# Make sure everything is committed
cd /Users/prantikroy/SETU
git add .
git commit -m "Configure for Render deployment: update settings, render.yaml, and environment"
git push origin main
```

### Step 2: Go to Render Dashboard
1. Visit https://render.com/dashboard
2. Click **"New +"** button
3. Select **"Blueprint"**

### Step 3: Deploy from Blueprint
1. Enter GitHub repository URL:
   ```
   https://github.com/Prantikroy-pixel/SETU.git
   ```
2. Click **"Connect"**
3. Render auto-detects `render.yaml`
4. Review configuration:
   - Frontend service: `setu-frontend`
   - Backend service: `setu-backend`
   - Database: `setu-db` (PostgreSQL)
5. Click **"Create from Blueprint"**

### Step 4: Monitor Deployment
- Render builds and deploys automatically
- Watch the logs in Render dashboard
- Wait for all 3 services to show **"Live"** status

Expected timeline: **3-5 minutes**

### Step 5: Access Your Application
Once deployed, you'll have:

**Frontend URL:**
```
https://setu-frontend.onrender.com
```

**Backend API URL:**
```
https://setu-backend-XXXXX.onrender.com
(where XXXXX is an auto-generated suffix)
```

**Database:**
- Auto-connected PostgreSQL instance
- Credentials stored securely in Render

---

## 📋 Environment Variables (Auto-Set by Render)

These are configured in `render.yaml` and auto-managed by Render:

| Variable | Source | Value |
|---|---|---|
| `PYTHON_VERSION` | render.yaml | 3.11.0 |
| `RENDER` | render.yaml | true |
| `DEBUG` | render.yaml | false |
| `SECRET_KEY` | Render Generated | *secure random* |
| `ALLOWED_HOSTS` | render.yaml | .onrender.com |
| `CSRF_TRUSTED_ORIGINS` | render.yaml | https://*.onrender.com |
| `CORS_ALLOWED_ORIGINS` | render.yaml | https://setu-frontend.onrender.com |
| `DATABASE_URL` | Render PostgreSQL | *auto-linked* |
| `DJANGO_SUPERUSER_USERNAME` | render.yaml | admin |
| `DJANGO_SUPERUSER_PASSWORD` | Render Generated | *secure random* |
| `DJANGO_SUPERUSER_EMAIL` | render.yaml | admin@setu.local |

---

## 🔍 Verification Checklist

After deployment, verify everything works:

### Frontend Access
- [ ] Visit `https://setu-frontend.onrender.com` in browser
- [ ] Page loads without errors
- [ ] CSS and images render correctly
- [ ] No console errors in browser DevTools

### Backend API
- [ ] Test auth endpoint:
  ```bash
  curl https://setu-backend-XXXXX.onrender.com/api/auth/me/
  ```
- [ ] Should respond with user info or auth error (not 500)

### Database Connection
- [ ] Backend logs show successful migration
- [ ] No "database connection failed" errors
- [ ] Tables created in PostgreSQL

### Login & Authentication
- [ ] Try logging in with mock credentials
- [ ] JWT tokens are issued
- [ ] Frontend can call protected endpoints

### API Functionality
- [ ] Districts list loads
- [ ] Needs can be created
- [ ] Resources can be registered
- [ ] Dashboard shows data

---

## 🛠️ Troubleshooting

### Build Fails

**Check logs:**
```
Render Dashboard → Backend Service → Logs
```

**Common causes:**
- Missing dependencies in `requirements.txt`
- Syntax errors in Python files
- Frontend build errors (check `npm run build`)

**Solution:** Fix the issue locally, commit, and Render will auto-redeploy

### Frontend Shows 404

**Cause:** Frontend static files not built correctly

**Solution:**
1. Check Frontend build command succeeded
2. Verify `Frontend/dist` exists after build
3. Restart frontend service in Render

### API Returns CORS Errors

**Cause:** CORS not properly configured

**Solution:**
1. Check `CORS_ALLOWED_ORIGINS` in `settings.py`
2. Verify frontend URL matches
3. Clear browser cache

### Database Connection Failed

**Cause:** PostgreSQL not ready or `DATABASE_URL` not set

**Solution:**
1. Wait 30 seconds for database to start
2. Check `DATABASE_URL` in Render environment
3. Verify `psycopg2-binary` in requirements
4. Check backend logs

### Services Keep Restarting

**Cause:** Unhealthy application

**Solution:**
1. Check logs for exceptions
2. Verify database migrations completed
3. Check all required env vars are set

---

## 📊 What Changed for Render

### `render.yaml`
- ✅ Added frontend static service
- ✅ Updated backend command for Render
- ✅ Added PostgreSQL database definition
- ✅ Configured environment variables
- ✅ Set Python version to 3.11.0

### `backend/config/settings.py`
- ✅ Added Render environment detection (`IS_RENDER`)
- ✅ Updated `ALLOWED_HOSTS` logic
- ✅ Configured database for PostgreSQL
- ✅ Added `.onrender.com` to CORS regex
- ✅ Improved HTTPS proxy header handling

### `backend/.env.example`
- ✅ Created reference for environment variables
- ✅ Documented all configuration options
- ✅ Provided example values

---

## 🔐 Security Checklist

- [x] Secret key is auto-generated (never hardcoded)
- [x] Database credentials only in `DATABASE_URL`
- [x] HTTPS enforced (Render auto-provides SSL)
- [x] CORS restricted to known origins
- [x] No sensitive data in git repository
- [x] `.env` file is in `.gitignore`
- [x] Superuser password auto-generated

---

## 📈 Performance & Scaling

### Current Configuration (Free Tier)
- **Frontend:** Static hosting (very fast)
- **Backend:** 1 gunicorn worker (limited concurrency)
- **Database:** PostgreSQL free tier (1GB storage)

### When to Upgrade
- Frontend: Generally never (static files are fast)
- Backend: If you need more concurrent users (upgrade plan)
- Database: If you exceed 1GB storage (backup and upgrade)

### Scaling Recommendations
1. Monitor Render dashboard for resource usage
2. Upgrade backend plan if response times slow
3. Consider caching layer (Redis) for high traffic
4. Archive old data if database fills up

---

## 🚨 Important Notes

1. **First-time setup**: Database migrations run automatically on backend startup
2. **Static files**: Collected automatically during build
3. **Media uploads**: Stored on Render's ephemeral filesystem (lost on redeploy)
   - For production, consider external storage (AWS S3, etc.)
4. **Free tier limits**: 
   - Services spin down after 15 min inactivity
   - Limited to 0.5GB RAM per service
   - Database limited to 1GB
5. **Auto-deployment**: Any push to main branch triggers redeploy

---

## ✨ Next Steps After Deployment

1. ✅ Verify all services are live
2. ✅ Create admin user if needed
3. ✅ Test full user workflow
4. ✅ Set up monitoring/alerts
5. ✅ Configure custom domain (optional)
6. ✅ Set up backups (if upgrading from free tier)

---

## 📞 Support & Help

- **Render Docs**: https://render.com/docs
- **Django Docs**: https://docs.djangoproject.com
- **React/Vite Docs**: https://vitejs.dev

---

**Status**: ✅ Ready for Deployment
**Configuration Date**: 2026-08-28
**Version**: SETU v1.0

