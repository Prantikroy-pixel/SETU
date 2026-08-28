# SETU Frontend - Separate Render Deployment

Since Render's `static_site` type works best as a standalone service, deploy the frontend separately from the backend.

## 🚀 Deploy Backend First (using render.yaml)

1. Go to https://render.com/dashboard
2. Click **"New+" → "Blueprint"**
3. Enter: `https://github.com/Prantikroy-pixel/SETU.git`
4. Render will deploy:
   - Backend service: `setu-backend.onrender.com`
   - PostgreSQL database: Auto-linked

## 🎨 Deploy Frontend Separately

After backend is deployed, deploy frontend as a separate static site:

1. Go to https://render.com/dashboard
2. Click **"New+" → "Static Site"**
3. Connect your GitHub repository
4. Fill in these settings:
   - **Name**: `setu-frontend`
   - **Branch**: `main`
   - **Build Command**: `cd Frontend && npm install && npm run build`
   - **Publish Directory**: `Frontend/dist`
5. Click **"Create Static Site"**

## 🔗 Connect Frontend to Backend

After both are deployed:

1. Get your backend URL: `https://setu-backend-XXXXX.onrender.com`
2. In `Frontend/src/api.js`, the `VITE_API_URL` defaults to empty string
3. Frontend will automatically use `/api/*` which routes to your backend
4. No configuration needed! ✅

## 📍 Final URLs

- **Frontend**: `https://setu-frontend.onrender.com`
- **Backend**: `https://setu-backend-XXXXX.onrender.com`
- **Database**: PostgreSQL (auto-linked, internal only)

## ⚙️ Update CORS if Needed

If you get CORS errors, update `backend/config/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'https://setu-frontend.onrender.com',  # Your frontend URL
]
```

Then redeploy the backend.

---

**Status**: ✅ Ready for two-step deployment
