# 🚀 Quick Start: Deploy to Railway

## Your app is ready for Railway deployment!

### ✅ What's Been Configured

1. ✅ **Server Configuration**
   - Uses `process.env.PORT` (Railway sets this automatically)
   - Listens on `0.0.0.0` (required for Railway)
   - CORS configured to accept all origins

2. ✅ **Package Configuration**
   - `package.json` has correct `start` script
   - Node.js version specified (18+)
   - All dependencies listed

3. ✅ **Deployment Files**
   - `nixpacks.toml` - Railway build configuration
   - `railway.json` - Railway deployment settings
   - `.nvmrc` - Node.js version specification

4. ✅ **Git Configuration**
   - `.gitignore` excludes unnecessary files
   - Database files excluded from git

## 🎯 Deploy Now (Choose One Method)

### Method 1: Railway Web Dashboard (Recommended - No Git Needed)

1. **Go to Railway**
   - Visit: https://railway.app
   - Sign up/Login (free account)

2. **Create Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - **OR** select "Empty Project" → "Add Service" → "GitHub Repo"

3. **Connect Repository**
   - If you have GitHub: Select your repo
   - If you don't have GitHub: 
     - Create a repo on GitHub first
     - Push your code to GitHub
     - Then connect it to Railway

4. **Deploy**
   - Railway auto-detects Node.js
   - Click "Deploy Now"
   - Wait 2-5 minutes

5. **Get Your URL**
   - Railway provides a public URL automatically
   - Your app will be live at: `https://your-app-name.up.railway.app`

### Method 2: Railway CLI (Requires Git)

1. **Install Railway CLI**
   ```powershell
   npm install -g @railway/cli
   ```

2. **Login**
   ```powershell
   railway login
   ```

3. **Initialize**
   ```powershell
   railway init
   ```

4. **Deploy**
   ```powershell
   railway up
   ```

5. **Get URL**
   ```powershell
   railway domain
   ```

## ⚠️ Important Notes

### Database (SQLite)
- **Temporary Storage**: Data is lost on every deployment/restart
- This is fine for development/demo
- For production: Use Railway's PostgreSQL plugin

### File Uploads
- **Temporary**: Uploaded files are lost on restart
- For production: Use cloud storage (S3, Cloudinary, etc.)

### Environment Variables
- `PORT` is automatically set by Railway
- No configuration needed for basic deployment

## 🔍 Verify Deployment

After deployment, test:
1. ✅ Homepage loads
2. ✅ Authentication works (sign up/login)
3. ✅ Dashboard works
4. ✅ Chat functionality works
5. ✅ Booking works

## 🐛 Troubleshooting

### Build Fails
- Check Railway logs in dashboard
- Verify all dependencies in `package.json`
- Ensure Node.js 18+ is used

### App Crashes
- Check logs: Railway Dashboard → Service → Logs
- Verify database initialization
- Check PORT environment variable usage

### Can't Access
- Verify deployment status (should be green)
- Check service is running
- Verify public URL is correct

## 📚 Next Steps

1. **Custom Domain** (Optional)
   - Railway Dashboard → Settings → Custom Domain

2. **Environment Variables** (Optional)
   - Add session secret as env variable
   - Add other config as needed

3. **PostgreSQL** (For Production)
   - Add PostgreSQL plugin in Railway
   - Update `server.js` to use PostgreSQL

## 🎉 You're Done!

Your Know Law website is now live on Railway!

**Support:**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

---

**Need to install Git first?** See `INSTALL_GIT.md` for instructions.

