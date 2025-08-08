# 🚀 GitHub + Netlify Deployment Guide

## Step 1: Create GitHub Repository

1. **Go to GitHub**
   - Visit [github.com](https://github.com)
   - Sign in or create an account
   - Click the "+" icon and select "New repository"

2. **Repository Setup**
   - Repository name: `minh-dai-wedding` (or your preferred name)
   - Description: "Wedding website for Minh & Đại - June 26, 2026"
   - Make it **Public** (required for free Netlify)
   - ✅ Add a README file
   - ✅ Add .gitignore (Node template)
   - Click "Create repository"

## Step 2: Upload Your Files to GitHub

### Method A: Using GitHub Web Interface (Easiest)

1. **Upload Files**
   - In your new repository, click "uploading an existing file"
   - Drag and drop ALL files from your wedding folder:
     ```
     ├── public/
     │   ├── index.html
     │   ├── styles.css
     │   ├── main.js
     │   └── manifest.json
     ├── netlify/
     │   └── functions/
     │       └── rsvp.js
     ├── netlify.toml
     ├── package.json
     └── .gitignore
     ```

2. **Commit Changes**
   - Scroll down to "Commit changes"
   - Title: "Initial wedding website setup"
   - Click "Commit changes"

### Method B: Using Git Commands (If you prefer command line)

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial wedding website setup"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/minh-dai-wedding.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Netlify

1. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Sign up" and choose "Sign up with GitHub"
   - Authorize Netlify to access your GitHub account

2. **Create New Site**
   - Click "New site from Git"
   - Choose "GitHub" as your Git provider
   - Select your wedding website repository

3. **Deploy Settings**
   - **Branch to deploy**: `main`
   - **Build command**: Leave empty (no build needed)
   - **Publish directory**: `public`
   - Click "Deploy site"

4. **Wait for Deployment**
   - Netlify will automatically deploy your site
   - You'll get a random URL like: `https://amazing-cupcake-123456.netlify.app`

## Step 4: Customize Your Site URL (Optional)

1. **Change Site Name**
   - In Netlify dashboard, go to "Site settings"
   - Click "Change site name"
   - Choose something like: `minh-dai-wedding-2026`
   - Your new URL: `https://minh-dai-wedding-2026.netlify.app`

2. **Add Custom Domain (Optional)**
   - Buy a domain from GoDaddy, Namecheap, etc.
   - In Netlify: "Domain settings" > "Add custom domain"
   - Follow the DNS setup instructions

## Step 5: Test Your Live Website

1. **Visit Your Site**
   - Go to your Netlify URL
   - Test all functionality:
     - ✅ Countdown timer works
     - ✅ Navigation smooth scrolling
     - ✅ Theme toggle (light/dark mode)
     - ✅ RSVP form submission

2. **Check RSVP Function**
   - Fill out the RSVP form and submit
   - Check Netlify Functions logs for submissions

## 🎉 You're Live!

Your wedding website is now live and accessible worldwide!

## 📱 Share Your Website

- **URL**: `https://your-site-name.netlify.app`
- **QR Code**: Generate one at [qr-code-generator.com](https://www.qr-code-generator.com)
- **Social Media**: Share the link on Facebook, Instagram, etc.

## 🔄 Making Updates

1. **Edit files locally**
2. **Upload changes to GitHub** (or use git commands)
3. **Netlify automatically redeploys** (usually takes 1-2 minutes)

## 🔧 Troubleshooting

### Common Issues:

1. **RSVP form not working**
   - Check Netlify Functions logs
   - Verify the function endpoint in `main.js`

2. **Site not updating**
   - Check if files were uploaded to GitHub
   - Clear browser cache
   - Check Netlify deploy logs

3. **Images not loading**
   - Make sure all image files are in the `public` folder
   - Check file paths in HTML/CSS

## 📊 Monitoring RSVPs

Currently, RSVPs are logged in Netlify Functions. To collect them properly, you can:

1. **Add email notifications** (using SendGrid)
2. **Store in Google Sheets** (using Google Sheets API)
3. **Use Airtable** (easy database solution)
4. **Set up Netlify Forms** (simpler alternative)

Would you like me to help set up any of these RSVP collection methods?

---

**Need Help?** 
- Check Netlify documentation: [docs.netlify.com](https://docs.netlify.com)
- GitHub documentation: [docs.github.com](https://docs.github.com)
