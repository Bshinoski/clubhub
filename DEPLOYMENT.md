# ClubHub Deployment Guide - Render

This guide will help you deploy ClubHub to Render (easiest option).

## Prerequisites

1. A [Render account](https://render.com) (free tier available)
2. Your code pushed to GitHub

## Deployment Steps

### Option 1: Using the Blueprint (Easiest)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New" → "Blueprint"

3. **Connect Your Repository**
   - Connect your GitHub account if not already connected
   - Select the `clubhub` repository
   - Render will automatically detect the `render.yaml` file

4. **Configure Environment Variables**

   After deployment is initiated, you need to set these environment variables manually:

   **For clubhub-api (Backend):**
   - `CORS_ORIGINS`: Set to your frontend URL (e.g., `https://clubhub-frontend.onrender.com`)
   - `FRONTEND_URL`: Same as above
   - `LOCAL_STORAGE_URL_PREFIX`: Your backend URL + `/uploads` (e.g., `https://clubhub-api.onrender.com/uploads`)
   - `JWT_SECRET_KEY`: Will be auto-generated, but you can change it if needed

   **For clubhub-frontend (Frontend):**
   - `VITE_API_URL`: Set to your backend URL (e.g., `https://clubhub-api.onrender.com`)

5. **Deploy**
   - Click "Apply" to start the deployment
   - Wait 5-10 minutes for both services to build and deploy

6. **Update Environment Variables After First Deploy**
   - Once deployed, you'll get the actual URLs for both services
   - Go to each service → Environment
   - Update the environment variables with the correct URLs
   - Services will automatically redeploy

### Option 2: Manual Deployment

If you prefer to deploy services individually:

#### Backend Deployment

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `clubhub-api`
   - **Runtime**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Add a persistent disk:
   - **Name**: `clubhub-data`
   - **Mount Path**: `/opt/render/project/src/backend`
   - **Size**: 1 GB
5. Add environment variables (see above)
6. Click "Create Web Service"

#### Frontend Deployment

1. Go to Render Dashboard → "New" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `clubhub-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. Add environment variable:
   - `VITE_API_URL`: Your backend URL from above
5. Add rewrite rule for SPA routing:
   - Go to "Redirects/Rewrites"
   - Add: Source `/*` → Destination `/index.html` (Rewrite)
6. Click "Create Static Site"

## Post-Deployment

### Access Your Application

- **Frontend**: `https://clubhub-frontend.onrender.com`
- **Backend API**: `https://clubhub-api.onrender.com`
- **API Docs**: `https://clubhub-api.onrender.com/docs` (only in debug mode)

### Important Notes

1. **Free Tier Limitations**:
   - Services spin down after 15 minutes of inactivity
   - First request after spin-down takes 30-60 seconds
   - Upgrade to paid tier for always-on services

2. **Database**:
   - Currently using SQLite with persistent disk
   - Database persists across deployments
   - For production, consider upgrading to PostgreSQL

3. **File Storage**:
   - Using local storage on persistent disk
   - For production, consider AWS S3 or similar

4. **CORS Configuration**:
   - Make sure CORS_ORIGINS includes your frontend URL
   - Update whenever you change domains

### Troubleshooting

1. **Build Fails**:
   - Check the build logs in Render dashboard
   - Ensure all dependencies are in requirements.txt / package.json

2. **Backend 502 Error**:
   - Check if the service is still spinning up (takes ~2 minutes)
   - Verify environment variables are set correctly
   - Check logs for Python errors

3. **Frontend Can't Connect to Backend**:
   - Verify VITE_API_URL is set correctly
   - Check CORS_ORIGINS includes your frontend URL
   - Try accessing backend health endpoint: `https://your-backend.onrender.com/health`

4. **Database Issues**:
   - Verify persistent disk is mounted correctly
   - Check disk isn't full (1 GB limit on free tier)

### Upgrading to Production

For production deployment, consider:

1. **Upgrade to Paid Plans**:
   - Backend: Starter ($7/month) or higher for always-on
   - Frontend: Stays free for static sites

2. **Use PostgreSQL**:
   - Render provides managed PostgreSQL
   - Migrate from SQLite to PostgreSQL
   - Update database connection in backend

3. **Use S3 for Photos**:
   - Set `USE_LOCAL_STORAGE=False`
   - Configure AWS credentials
   - Update S3 bucket settings

4. **Add Custom Domain**:
   - Configure in Render dashboard
   - Update CORS_ORIGINS and FRONTEND_URL

5. **Enable Monitoring**:
   - Set up error tracking (e.g., Sentry)
   - Configure uptime monitoring
   - Set up log aggregation

## Alternative: Quick Deploy Script

If you want to automate the manual steps, you can use Render's API:

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy using blueprint
render blueprint deploy
```

## Need Help?

- [Render Documentation](https://render.com/docs)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)
