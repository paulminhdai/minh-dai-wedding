# Free Hosting Options for Your Wedding Website

## 🌟 Recommended: GitHub Pages (Best for Static Sites)

GitHub Pages is perfect for your wedding website since it's mostly static content.

### Setup Steps:

1. **Create a GitHub Repository**
   - Go to [GitHub.com](https://github.com) and create an account if needed
   - Create a new repository named `your-wedding-website` (or any name)
   - Make it public (required for free GitHub Pages)

2. **Upload Your Files**
   - Upload all files from your `public` folder to the repository
   - Your folder structure should look like:
     ```
     /
     ├── index.html
     ├── styles.css
     ├── main.js
     ├── manifest.json
     └── (other assets)
     ```

3. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

4. **Your website will be live at:**
   `https://yourusername.github.io/your-wedding-website`

### ⚠️ Important Note:
GitHub Pages only hosts **static** websites. Your current setup has a Node.js backend for RSVP functionality, so you'll need to modify it.

## 🔄 Converting to Static-Only Version

Since your site has a backend, here are your options:

### Option 1: Use External Form Service (Recommended)
Replace the RSVP backend with a service like:
- **Formspree** (free tier: 50 submissions/month)
- **Netlify Forms** (free tier: 100 submissions/month)
- **Google Forms** (unlimited, free)

### Option 2: Keep Backend - Use Different Hosting

## 🚀 Alternative Free Hosting Options

### 1. **Netlify** (Recommended for Full-Stack)
- **Pros**: Supports both static and serverless functions
- **Free tier**: 100GB bandwidth, 300 build minutes
- **Perfect for**: Your current setup with RSVP backend
- **Setup**: Connect your GitHub repo, auto-deploys on commits

### 2. **Vercel**
- **Pros**: Excellent for modern web apps
- **Free tier**: 100GB bandwidth, serverless functions
- **Perfect for**: Your current setup
- **Setup**: Connect GitHub repo, instant deployments

### 3. **Railway** (for Node.js backends)
- **Pros**: Great for Node.js applications
- **Free tier**: $5 credit monthly (usually enough for small sites)
- **Perfect for**: Your current backend-heavy setup

### 4. **Render**
- **Pros**: Easy deployment from GitHub
- **Free tier**: 750 hours/month, auto-sleep after 15min inactivity
- **Perfect for**: Full-stack applications

## 📋 Quick Setup Guide for Netlify (Recommended)

1. **Prepare Your Code**
   - Push your wedding website to GitHub
   - Make sure your backend works locally

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub
   - Click "New site from Git"
   - Select your repository
   - Build settings:
     - Build command: `npm run build` (if you have one) or leave empty
     - Publish directory: `public` (or root if uploading frontend only)

3. **Configure Environment Variables**
   - In Netlify dashboard, go to Site settings > Environment variables
   - Add any environment variables your app needs

4. **Custom Domain (Optional)**
   - You can use Netlify's free subdomain: `yoursite.netlify.app`
   - Or connect a custom domain you purchase

## 🎯 Recommendation for Your Wedding Website

**For easiest setup:** Use **Netlify** or **Vercel**
- Both support your current Node.js backend
- Free tiers are generous
- Automatic deployments from GitHub
- Easy to set up custom domains
- SSL certificates included

**For simplest hosting:** Use **GitHub Pages** + **Formspree**
- Convert RSVP form to use Formspree
- Pure static hosting
- Completely free
- Very reliable

## 🔧 Next Steps

Would you like me to help you:
1. Set up GitHub Pages with a form service?
2. Deploy to Netlify with your current backend?
3. Convert your RSVP form to use an external service?

Let me know which option you prefer!
