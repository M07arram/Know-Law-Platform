# Quick Railway Deployment Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Prepare Your Code

✅ Your code is already configured for Railway:
- ✅ `package.json` has `start` script
- ✅ Server uses `process.env.PORT` 
- ✅ Server listens on `0.0.0.0`
- ✅ `.gitignore` is configured

### Step 2: Push to GitHub (if not already)

1. **Create a GitHub repository** (if you don't have one)
   ```bash
   # Skip if Git is not installed - you can use Railway's web interface instead
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

   **OR** if Git is not installed, you can:
   - Use Railway's GitHub integration to create a repo
   - Or deploy directly from your local files using Railway CLI

### Step 3: Deploy to Railway

#### Option A: Deploy via Railway Web Dashboard (Easiest)

1. **Go to Railway**
   - Visit https://railway.app
   - Sign up/Login (use GitHub for easiest integration)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js

3. **Deploy**
   - Click "Deploy Now"
   - Wait for deployment (2-5 minutes)
   - Your app will be live!

4. **Get Your URL**
   - Railway will provide a public URL
   - Click on the service → Settings → Generate Domain
   - Your app is now live at: `https://your-app-name.up.railway.app`

#### Option B: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize & Deploy**
   ```bash
   railway init
   railway up
   ```

4. **Get Your URL**
   ```bash
   railway domain
   ```

### Step 4: Verify Deployment

1. Visit your Railway URL
2. Test the application:
   - Homepage loads
   - Authentication works
   - Chat functionality works
   - Booking works

## ⚠️ Important Notes

### Database (SQLite)
- **Data is temporary** - SQLite database resets on every deployment
- For production, use Railway's PostgreSQL plugin
- This is fine for development/demo

### File Uploads
- Uploaded files are **temporary** (lost on restart)
- For production, use cloud storage (S3, Cloudinary, etc.)

### Environment Variables
- `PORT` is automatically set by Railway
- No additional configuration needed for basic deployment

## 🔧 Troubleshooting

### Build Fails
- Check Railway logs in the dashboard
- Verify `package.json` has all dependencies
- Ensure Node.js version is compatible (Railway uses Node 18+)

### App Crashes
- Check logs: Railway Dashboard → Your Service → Logs
- Verify database file permissions
- Check that PORT environment variable is used

### Can't Access App
- Verify deployment succeeded (green status)
- Check that service is running
- Verify the public URL is correct

## 📝 Next Steps

1. **Custom Domain** (Optional)
   - Railway Dashboard → Settings → Custom Domain
   - Add your domain

2. **Environment Variables** (Optional)
   - Add session secret as environment variable
   - Add other configuration as needed

3. **PostgreSQL** (For Production)
   - Add PostgreSQL plugin in Railway
   - Update database connection in `server.js`

## 🎉 You're Done!

Your Know Law website is now live on Railway!

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

