# 🚀 Quick Start: Deploy to Render in 5 Minutes

## Step 1: Push to GitHub (if not already done)

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

## Step 2: Deploy on Render

1. Go to https://dashboard.render.com
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account (if not connected)
4. Select your **clubhub** repository
5. Click **"Apply"**

Render will automatically:
- Create 2 services (backend API + frontend)
- Install dependencies
- Deploy both services

## Step 3: Get Your URLs

After ~5 minutes, you'll have:
- **Backend**: `https://clubhub-api.onrender.com`
- **Frontend**: `https://clubhub-frontend.onrender.com`

## Step 4: Update Environment Variables

### Backend (clubhub-api):
1. Go to service → **Environment**
2. Update these variables:
   - `CORS_ORIGINS`: `https://clubhub-frontend.onrender.com`
   - `FRONTEND_URL`: `https://clubhub-frontend.onrender.com`
   - `LOCAL_STORAGE_URL_PREFIX`: `https://clubhub-api.onrender.com/uploads`

### Frontend (clubhub-frontend):
1. Go to service → **Environment**
2. Update:
   - `VITE_API_URL`: `https://clubhub-api.onrender.com`

## Step 5: Wait for Auto-Redeploy

After updating env vars, services auto-redeploy (~2 mins).

## ✅ Done!

Visit your frontend URL and start using ClubHub!

---

## 📝 Notes

- **Free tier**: Services sleep after 15 mins of inactivity
- **First load**: Takes 30-60 seconds after sleep
- **Database**: SQLite with 1GB persistent disk
- **Need help?** See full [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔧 Troubleshooting

**Frontend can't reach backend?**
- Check VITE_API_URL is correct
- Verify CORS_ORIGINS includes frontend URL
- Try: `https://clubhub-api.onrender.com/health`

**Service won't start?**
- Check logs in Render dashboard
- Verify all env vars are set
- Wait 2-3 minutes for full startup
