# 🚀 Railway Deployment Guide

Deploy your complete wedding website (frontend + backend) to Railway in minutes!

## 🎯 Why Railway?

**Railway is PERFECT for your wedding website because:**
- ✅ **Zero code changes needed** - deploys your existing `server.js`
- ✅ **Frontend + Backend together** - one deployment, one URL
- ✅ **Database works perfectly** - full Express.js + Supabase support
- ✅ **Automatic HTTPS** and custom domains
- ✅ **$5/month** - much simpler than multiple services
- ✅ **Real-time logs** and monitoring
- ✅ **Auto-deploys** from GitHub on every push
- ✅ **Health checks** and automatic restarts

## 📋 Pre-Deployment Checklist

Before deploying to Railway, ensure you have:

- ✅ **Code pushed to GitHub** - Railway deploys from your Git repository
- ✅ **Supabase project created** - with schema.sql executed
- ✅ **Supabase credentials ready**:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
- ✅ **Admin password chosen** - strong, unique password
- ✅ **Node.js 18+** specified in package.json (already configured)
- ✅ **Configuration files** present:
  - `railway.toml` - Railway configuration
  - `Procfile` - Process command
  - `.railwayignore` - Files to exclude

---

## 📋 Step-by-Step Deployment

### **Step 1: Prepare Your Code**

✅ **Your code is already Railway-ready!** 

The repository includes:
- ✅ `package.json` with Node.js 18+ engine specification
- ✅ `railway.toml` configuration file
- ✅ `Procfile` for explicit start command
- ✅ `.railwayignore` to exclude unnecessary files
- ✅ Health check endpoint at `/api/health`

**If you've made changes, commit and push to GitHub**:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### **Step 2: Create Railway Account**

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended)

### **Step 3: Deploy from GitHub**

1. Click **"Deploy from GitHub repo"**
2. Authorize Railway to access your GitHub account
3. Select your wedding website repository
4. Railway will automatically:
   - Detect it's a Node.js app
   - Read `railway.toml` for configuration
   - Use the `Procfile` for start command
   - Install dependencies from `package.json`
5. Click **"Deploy Now"**

⏳ Initial build will take 2-3 minutes.

### **Step 4: Configure Environment Variables**

Railway will start building, but you need to add your environment variables:

1. Go to your project dashboard on Railway
2. Click **"Variables"** tab
3. Add these environment variables:

```bash
# Required Variables
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_PASSWORD=your_secure_admin_password

# Optional Variables
ENABLE_GUEST_VALIDATION=true
NODE_ENV=production
```

### **Step 5: Redeploy**

After adding environment variables:
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete (~2-3 minutes)
4. Check the logs to ensure successful startup:
   ```
   ✅ Server listening on port XXXX
   ✅ Database connected successfully
   ```

💡 **Tip**: Railway auto-deploys on every push to main branch after initial setup!

### **Step 6: Get Your Live URL**

1. Once deployed, Railway will give you a URL like:
   ```
   https://your-app-name.railway.app
   ```
2. This is your complete wedding website!

## 🌐 Access Your Live Website

### **Main Website:**
```
https://your-app.railway.app
```

### **Admin Dashboard:**
```
https://your-app.railway.app/admin
```

### **API Endpoints:**
```
https://your-app.railway.app/api/rsvp
https://your-app.railway.app/api/admin
https://your-app.railway.app/api/admin/guests
```

## ✅ What You Get

### **Frontend (Same URLs):**
- Main wedding page: `/`
- Admin dashboard: `/admin`
- All static files: CSS, images, etc.

### **Backend (Fully Functional):**
- RSVP submissions: `POST /api/rsvp`
- Admin data: `GET /api/admin`
- Guest management: `/api/admin/guests`
- All database operations working perfectly!

### **Database:**
- Your Supabase database works exactly the same
- All admin logging, guest management, RSVP tracking

## 🎨 Custom Domain (Optional)

1. In Railway dashboard, go to **"Settings"**
2. Click **"Domains"**
3. Click **"Custom Domain"**
4. Enter your domain (e.g., `minhanddai.com`)
5. Follow DNS configuration instructions

## 🔧 Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xyz.supabase.co` | ✅ Yes |
| `SUPABASE_ANON_KEY` | Public anon key | `eyJhbGciOiJIUzI1...` | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!) | `eyJhbGciOiJIUzI1...` | ✅ Yes |
| `ADMIN_PASSWORD` | Admin dashboard password | `your_secure_password` | ✅ Yes |
| `ENABLE_GUEST_VALIDATION` | Enable guest list validation | `true` or `false` | ⚠️ Recommended |
| `NODE_ENV` | Environment mode | `production` | ⚠️ Recommended |
| `PORT` | Server port (Railway sets automatically) | `3000` | ⬜ Auto-set |

## 📊 Monitoring & Logs

### **View Real-Time Logs:**
1. Railway dashboard → Your project
2. Click **"Deployments"**
3. Click on latest deployment
4. View real-time logs showing:
   ```
   🚀 Wedding website server running on port XXXX
   🔗 Initializing database connection...
   ✅ Database connected successfully
   ```

### **Health Check Monitoring:**
Railway automatically monitors your app using the `/api/health` endpoint defined in `railway.toml`:
- Checks every 100 seconds
- Auto-restarts on failure (up to 10 retries)
- Notifies you of downtime

### **Monitor Performance:**
1. **"Metrics"** tab shows:
   - CPU usage
   - Memory usage
   - Response times
   - Request count
   - Network activity

### **Deployment History:**
- View all past deployments
- Rollback to previous versions
- Compare deployment logs

## 🚨 Troubleshooting

### **Common Issues:**

#### 1. "Application failed to start"
- **Check logs** in Railway dashboard
- **Verify** all environment variables are set
- **Ensure** `package.json` has correct start script

#### 2. "Database connection failed"
- **Verify** SUPABASE_URL is correct
- **Check** SUPABASE_SERVICE_ROLE_KEY is set
- **Test** database connection locally first

#### 3. "Admin panel shows 'Unauthorized'"
- **Set** ADMIN_PASSWORD environment variable
- **Restart** deployment after adding variables

#### 4. "Port already in use" (Local testing)
```bash
# Kill local server before testing Railway
pkill -f "node server.js"
```

### **Deployment Logs to Check:**
```
✅ Installing dependencies...
✅ npm install completed
✅ Building application...
✅ Starting server with: npm start
✅ Server listening on port XXXX
✅ Database connected successfully - RSVPs will be saved to Supabase
🔗 Wedding website ready!
```

### **Configuration Files Working:**
Railway reads these files automatically:
- `railway.toml` - Deployment configuration
- `Procfile` - Start command
- `.railwayignore` - Files to exclude
- `package.json` - Dependencies and Node version

## 💡 Pro Tips

### **1. Development Workflow:**
```bash
# Test locally
npm start

# Push changes to trigger auto-deployment
git add .
git commit -m "Update feature"
git push origin main

# Railway auto-deploys from main branch within 2-3 minutes
```

### **2. Environment Management:**
- **Local**: Use `.env` file (never commit this!)
- **Railway**: Use Railway dashboard variables
- **Tip**: Keep `env.example` updated for team reference

### **3. Database Management:**
- **Supabase**: Same instance for dev and production
- **Admin panel**: Works identically on Railway
- **Backups**: Set up automated backups in Supabase dashboard

### **4. SSL/HTTPS:**
- Railway provides **automatic HTTPS** for all deployments
- No SSL certificate setup needed
- Custom domains get free SSL certificates automatically

### **5. Auto-Deployment:**
- Push to main branch = automatic deployment
- Failed deployments keep previous version running
- Use branches for testing before merging to main

### **6. Health Checks:**
- Railway pings `/api/health` every 100 seconds
- Automatic restart on failure (configured in `railway.toml`)
- View health check status in Metrics tab

## 🔄 Deployment Comparison

| Platform | Complexity | Setup Time | Monthly Cost | Features | Auto-Deploy |
|----------|------------|------------|--------------|----------|-------------|
| **Railway** | ⭐ Simple | 5 minutes | $5 | Full-stack, monitoring, health checks | ✅ Yes |
| **Netlify + Railway** | ⭐⭐ Medium | 15 minutes | $5 | Split stack | ⚠️ Partial |
| **Netlify Functions** | ⭐⭐⭐ Complex | 30+ minutes | Free | Limited, buggy | ✅ Yes |
| **Heroku** | ⭐⭐ Medium | 10 minutes | $7+ | Full-stack | ✅ Yes |
| **Vercel** | ⭐⭐ Medium | 10 minutes | Free-$20 | Serverless focus | ✅ Yes |

### Why Railway Wins for This Project:
- ✅ Full Express.js support (not limited to serverless functions)
- ✅ Built-in health checks and monitoring
- ✅ Automatic HTTPS and custom domains
- ✅ Simple environment variable management
- ✅ Real-time logs and metrics
- ✅ One-click rollbacks
- ✅ No cold starts (always running)

## ✨ Final Result

After Railway deployment, you'll have:

**🌐 One Beautiful URL:** `https://your-wedding.railway.app`

**All Features Working:**
- ✅ RSVP submissions save to Supabase database
- ✅ Admin dashboard with real-time data
- ✅ Guest list management by wedding side
- ✅ Activity logging and monitoring
- ✅ Mobile-responsive design
- ✅ Automatic HTTPS and security headers
- ✅ Health checks and auto-restart on failures
- ✅ Auto-deployment on every git push

**🚀 Production-Ready Features:**
- ⚡ Fast loading times (global CDN)
- 🔒 Secure HTTPS by default
- 📊 Real-time monitoring and logs
- 🔄 Zero-downtime deployments
- 💾 Persistent database with Supabase
- 🛡️ Rate limiting and security middleware
- 📱 PWA support for mobile installation

**🎊 Your wedding website will be live, fast, and fully functional!**

---

## 🚀 Ready to Deploy?

**✅ Pre-Flight Checklist:**
- [ ] Code pushed to GitHub (main branch)
- [ ] Supabase project created and schema.sql executed
- [ ] Environment variables ready (see table above)
- [ ] Admin password chosen (strong & secure)

**🎯 Deployment Steps:**
1. **Sign up** at [railway.app](https://railway.app)
2. **Connect** your GitHub repository
3. **Add** environment variables in Railway dashboard
4. **Deploy** and wait 2-3 minutes
5. **Visit** your live URL!

**📁 What Gets Deployed:**
- ✅ All files except those in `.railwayignore`
- ✅ `public/` directory (frontend assets)
- ✅ `server.js` (backend Express app)
- ✅ `database/` utilities (Supabase config)
- ✅ Node modules (installed automatically)

**⏱️ Deployment Timeline:**
- Initial setup: 5-10 minutes
- Each deployment: 2-3 minutes
- Auto-deploys: Triggered on every push to main

Your guests will love the professional, fast-loading wedding website! 💕

---

## 📚 Additional Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Troubleshooting**: See the section above or check Railway logs
- **Support**: Railway has excellent Discord support community
