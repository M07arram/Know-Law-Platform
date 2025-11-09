# Railway Deployment Guide

This guide will help you deploy the Know Law website to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Git installed (or use Railway's GitHub integration)

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Sign in to Railway**
   - Go to https://railway.app
   - Sign in with GitHub (recommended) or email

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (if you have the repo on GitHub)
   - OR select "Empty Project" and deploy manually

3. **Deploy from GitHub**
   - If using GitHub, select your repository
   - Railway will auto-detect it's a Node.js project
   - Click "Deploy Now"

4. **Configure Environment Variables** (if needed)
   - Railway will auto-detect the PORT (no need to set it)
   - The app will use the PORT environment variable automatically

5. **Wait for Deployment**
   - Railway will install dependencies and start your app
   - Once deployed, you'll get a public URL

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Railway in your project**
   ```bash
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Important Notes

### Database Storage

⚠️ **SQLite Database**: Railway uses an ephemeral filesystem. This means:
- The database will be **reset on every deployment**
- Data will be **lost when the service restarts**
- This is fine for development/demo, but for production you should:
  - Use Railway's PostgreSQL plugin
  - Or use an external database service

### Environment Variables

The app uses these environment variables:
- `PORT` - Automatically set by Railway (no action needed)
- Session secret is hardcoded (consider using Railway's environment variables for production)

### File Uploads

The `uploads/` directory is also ephemeral. Files uploaded will be lost on restart.
For production, consider using:
- Railway's volume storage
- Or cloud storage (AWS S3, Cloudinary, etc.)

## Post-Deployment

1. **Get your public URL**
   - Railway provides a public URL after deployment
   - You can also set a custom domain in Railway settings

2. **Test your deployment**
   - Visit the provided URL
   - Test authentication, chat, and booking features

3. **Monitor logs**
   - Use Railway's dashboard to view application logs
   - Check for any errors or warnings

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Railway uses Node.js 18+ by default)

### App Crashes
- Check Railway logs for error messages
- Verify database initialization (SQLite should auto-create)
- Check that PORT is being used correctly (it should be automatic)

### Database Issues
- Remember: SQLite data is ephemeral on Railway
- For persistent storage, use Railway's PostgreSQL plugin

## Production Recommendations

1. **Use PostgreSQL instead of SQLite**
   - Add Railway PostgreSQL plugin
   - Update database connection in `server.js`

2. **Set up environment variables**
   - Move session secret to environment variable
   - Add other sensitive configuration

3. **Set up custom domain**
   - Configure custom domain in Railway settings
   - Update CORS settings if needed

4. **Enable monitoring**
   - Use Railway's built-in monitoring
   - Set up error tracking (Sentry, etc.)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

