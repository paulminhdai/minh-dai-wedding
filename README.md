# Wedding Website - Minh & Đại

A modern, elegant wedding website with vintage blue & gold theme, featuring enterprise-grade security and database integration.

## 🎉 Live Website

**Website**: [https://minh-dai-wedding-2026.netlify.app](https://minh-dai-wedding-2026.netlify.app)  
**Wedding Date**: June 26, 2026  
**Venues**: Korean Martys Catholic Center & White Place 2, Orange County, CA

## ✨ Features

- 🎨 **Vintage Blue & Gold Theme**: Elegant color palette with Neptune navy, dusty blue, sage green, and gold accents
- 📱 **Fully Responsive**: Mobile-first design optimized for all devices
- ⚡ **Fast Performance**: Vanilla JavaScript, optimized images, lazy loading
- ♿ **Accessible**: Semantic HTML, ARIA labels, keyboard navigation
- 🌙 **Light/Dark Mode**: System-aware theme toggle with smooth transitions
- 📝 **RSVP System**: Database-backed with validation and sanitization
- 🗓️ **Live Countdown**: Real-time countdown to wedding ceremony
- 📸 **Photo Gallery**: Lazy-loaded image gallery with lightbox
- 🗺️ **Interactive Maps**: Embedded Google Maps for ceremony and reception venues
- 🎵 **Smooth Animations**: CSS transitions and scroll-triggered animations
- 🚀 **PWA Ready**: Service worker, app manifest, offline support
- 🔒 **Enterprise Security**: JWT auth, CORS, rate limiting, Helmet.js, input validation

## 🏗️ Architecture

### Frontend (Static Assets)
- **HTML5**: Semantic structure with JSON-LD structured data
- **CSS3**: Custom properties, Grid/Flexbox, modern features
- **Vanilla JavaScript**: Modular IIFE patterns, no frameworks
- **Progressive Web App**: Service worker, manifest, offline-first

### Backend (Express.js Server)
- **Express.js**: RESTful API with security middleware
- **Supabase Database**: PostgreSQL database for RSVPs and guests
- **JWT Authentication**: Secure admin authentication with HTTP-only cookies
- **Security Middleware**: Helmet.js, CORS, rate limiting, input validation
- **Request Validation**: express-validator for all inputs
- **Comprehensive Logging**: Admin activity tracking

## 🔐 Security Features (NEW in v2.1.0)

- ✅ **JWT Authentication**: Secure token-based admin authentication
- ✅ **CORS Protection**: Origin whitelisting and cross-origin protection
- ✅ **Helmet.js**: Comprehensive security headers
- ✅ **Rate Limiting**: Brute force and DDoS protection
- ✅ **Input Validation**: Request validation with express-validator
- ✅ **Input Sanitization**: XSS and injection prevention
- ✅ **HTTPS Enforcement**: Automatic HTTPS redirect in production
- ✅ **HTTP-only Cookies**: Secure token storage
- ✅ **Request Logging**: Security monitoring and audit trail

**📖 See [SECURITY.md](SECURITY.md) for detailed security documentation**

## 📚 Documentation

- **[SECURITY.md](SECURITY.md)** - Comprehensive security documentation
- **[MIGRATION.md](MIGRATION.md)** - Migration guide from v2.0.0 to v2.1.0
- **[SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)** - Quick security overview
- **[HOSTING_GUIDE.md](HOSTING_GUIDE.md)** - Deployment instructions
- **[RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)** - Railway-specific deployment

