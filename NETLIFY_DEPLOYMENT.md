# 🚀 Netlify Deployment Guide

This guide will help you deploy your wedding website to Netlify with full database functionality.

## ✅ Pre-Deployment Checklist

- [ ] Supabase database is set up and working locally
- [ ] All environment variables are ready
- [ ] Code is pushed to GitHub repository

## 📋 Step-by-Step Deployment

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for Netlify deployment"
git push origin main
```

### 2. **Connect to Netlify**
1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repository
4. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: (leave empty)
   - **Publish directory**: `public`

### 3. **Set Environment Variables**

In Netlify dashboard → Site settings → Environment variables, add:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_PASSWORD=your_secure_admin_password
ENABLE_GUEST_VALIDATION=true
```

⚠️ **IMPORTANT**: Make sure to set all environment variables BEFORE deploying!

### 4. **Deploy**
Click "Deploy site" and wait for the build to complete.

## 🔧 How It Works

### Local Development vs Production

The code automatically detects the environment and uses appropriate endpoints:

**Local Development** (server.js):
- `/api/rsvp` → Handled by Express server
- `/api/admin/*` → Handled by Express server

**Production** (Netlify):
- `/.netlify/functions/rsvp` → Netlify Function
- `/.netlify/functions/admin` → Netlify Function
- `/.netlify/functions/admin-guests` → Netlify Function
- `/.netlify/functions/admin-rsvp` → Netlify Function
- `/.netlify/functions/admin-logs` → Netlify Function

### File Structure for Netlify

```
your-repo/
├── public/              # ← This gets deployed (static files)
│   ├── index.html
│   ├── admin.html
│   ├── styles.css
│   ├── main.js
│   └── images/
├── netlify/
│   └── functions/       # ← Serverless functions
│       ├── rsvp.js
│       ├── admin.js
│       ├── admin-guests.js
│       ├── admin-rsvp.js
│       └── admin-logs.js
├── database/            # ← Not deployed (reference only)
└── server.js            # ← Not used in production
```

## 🌐 Post-Deployment

### 1. **Test Your Site**
- Visit: `https://your-site.netlify.app`
- Test RSVP form
- Test admin panel: `https://your-site.netlify.app/admin`

### 2. **Custom Domain** (Optional)
1. In Netlify → Domain settings
2. Add your custom domain
3. Follow DNS configuration instructions

### 3. **Monitor Functions**
- Netlify dashboard → Functions tab
- View logs and execution times
- Monitor for errors

## 🚨 Troubleshooting

### "Unauthorized" errors
- Check ADMIN_PASSWORD is set in Netlify environment variables
- Ensure you're using the correct password

### "Database connection failed"
- Verify all Supabase environment variables are set correctly
- Check Supabase project is active

### Functions not working
- Check Functions tab in Netlify dashboard for errors
- Verify environment variables are set
- Check function logs for specific errors

### CORS errors
- Already handled in the functions code
- If issues persist, check browser console for details

## 📊 Important Differences

| Feature | Local Development | Netlify Production |
|---------|------------------|-------------------|
| Server | Express.js (`server.js`) | Netlify Functions |
| Database | Direct Supabase connection | Via Netlify Functions |
| Static Files | Served by Express | Served by Netlify CDN |
| API Routes | `/api/*` | `/.netlify/functions/*` |
| Environment | `.env` file | Netlify Environment Variables |

## 🎉 Success!

Once deployed, your wedding website will have:
- ✅ Fast global CDN hosting
- ✅ Automatic HTTPS
- ✅ Serverless API endpoints
- ✅ Full database functionality
- ✅ Admin dashboard access
- ✅ Scalable architecture

Remember: The `server.js` file is ONLY for local development. Netlify uses the functions in `netlify/functions/` instead!
