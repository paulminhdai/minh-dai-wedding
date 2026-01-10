# 🚀 Railway Deployment Guide

Deploy your complete wedding website (frontend + backend) to Railway in minutes!

## 🎯 Why Railway?

**Railway is PERFECT for your wedding website because:**
- ✅ **Zero code changes needed** - deploys your existing `server.js`
- ✅ **Frontend + Backend together** - one deployment, one URL
- ✅ **Database works perfectly** - full Express.js support
- ✅ **Automatic HTTPS** and custom domains
- ✅ **$5/month** - much simpler than multiple services
- ✅ **Real-time logs** and monitoring

## 📋 Step-by-Step Deployment

### **Step 1: Prepare Your Code**

Your code is already Railway-ready! But let's make one small optimization:

1. **Update package.json** (add engines for Node version):
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

2. **Commit and push to GitHub**:
```bash
git add package.json
git commit -m "Add Node.js engine specification for Railway"
git push origin main
```

### **Step 2: Create Railway Account**

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended)

### **Step 3: Deploy from GitHub**

1. Click **"Deploy from GitHub repo"**
2. Select your wedding website repository
3. Railway will automatically detect your Node.js app
4. Click **"Deploy Now"**

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
2. Click **"Redeploy"** (or push a new commit to GitHub)
3. Wait for deployment to complete (~2-3 minutes)

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

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key | `eyJhbGciOiJIUzI1...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!) | `eyJhbGciOiJIUzI1...` |
| `ADMIN_PASSWORD` | Admin dashboard password | `your_secure_password` |
| `ENABLE_GUEST_VALIDATION` | Enable guest list validation | `true` or `false` |
| `NODE_ENV` | Environment mode | `production` |

## 📊 Monitoring & Logs

### **View Logs:**
1. Railway dashboard → Your project
2. Click **"Deployments"**
3. Click on latest deployment
4. View real-time logs

### **Monitor Performance:**
1. **"Metrics"** tab shows:
   - CPU usage
   - Memory usage
   - Response times
   - Request count

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
✅ Building application...
✅ Starting server...
✅ Server listening on port 3000
✅ Database connected successfully
```

## 💡 Pro Tips

### **1. Development Workflow:**
```bash
# Test locally
npm start

# Push changes
git add .
git commit -m "Update feature"
git push origin main

# Railway auto-deploys from main branch
```

### **2. Environment Management:**
- **Local**: Use `.env` file
- **Railway**: Use Railway dashboard variables
- **Never commit** `.env` to GitHub

### **3. Database Management:**
- **Development**: Test with local Supabase
- **Production**: Same Supabase instance
- **Admin panel**: Works identically on Railway

### **4. SSL/HTTPS:**
- Railway provides **automatic HTTPS**
- No SSL certificate setup needed
- Custom domains get free SSL

## 🔄 Deployment Comparison

| Platform | Complexity | Setup Time | Monthly Cost | Features |
|----------|------------|------------|--------------|----------|
| **Railway** | ⭐ Simple | 5 minutes | $5 | Full-stack, monitoring |
| **Netlify + Railway** | ⭐⭐ Medium | 15 minutes | $5 | Split stack |
| **Netlify Functions** | ⭐⭐⭐ Complex | 30+ minutes | Free | Limited, buggy |

## ✨ Final Result

After Railway deployment, you'll have:

**🌐 One Beautiful URL:** `https://your-wedding.railway.app`

**All Features Working:**
- ✅ RSVP submissions save to database
- ✅ Admin dashboard with real-time data
- ✅ Guest list management by wedding side
- ✅ Activity logging and monitoring
- ✅ Mobile-responsive design
- ✅ Automatic HTTPS and security headers

**🎊 Your wedding website will be live, fast, and fully functional!**

---

## 🚀 Ready to Deploy?

1. **Push your code** to GitHub
2. **Sign up** at [railway.app](https://railway.app)
3. **Connect** your repo
4. **Add** environment variables
5. **Watch** it deploy automatically!

Your guests will love the professional, fast-loading wedding website! 💕
