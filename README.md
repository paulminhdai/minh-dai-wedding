# Wedding Website - Minh & Đại

A modern, elegant wedding website with vintage blue & gold theme, built for Netlify deployment with serverless functions.

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
- 📝 **RSVP System**: Serverless form with validation and sanitization
- 🗓️ **Live Countdown**: Real-time countdown to wedding ceremony
- � **Photo Gallery**: Lazy-loaded image gallery with lightbox
- 🗺️ **Interactive Maps**: Embedded Google Maps for ceremony and reception venues
- 🎵 **Smooth Animations**: CSS transitions and scroll-triggered animations
- 🚀 **PWA Ready**: Service worker, app manifest, offline support
- 🔒 **Security**: Input sanitization, CORS protection, rate limiting

## 🏗️ Architecture

### Frontend (Static Assets)
- **HTML5**: Semantic structure with JSON-LD structured data
- **CSS3**: Custom properties, Grid/Flexbox, modern features
- **Vanilla JavaScript**: Modular IIFE patterns, no frameworks
- **Progressive Web App**: Service worker, manifest, offline-first

### Backend (Serverless Functions)
- **Netlify Functions**: Node.js serverless RSVP processing
- **CORS Enabled**: Cross-origin resource sharing configured
- **Input Validation**: Sanitization and phone number validation
- **Error Handling**: Comprehensive error responses

## 📁 Project Structure

```
minh-dai-wedding/
├── public/                    # Static website files (deployed to Netlify)
│   ├── index.html            # Main website HTML
│   ├── styles.css            # Complete responsive styling
│   ├── main.js               # Interactive functionality
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── images/               # Wedding photos and assets
├── netlify/
│   └── functions/
│       └── rsvp.js           # Serverless RSVP handler
├── netlify.toml              # Netlify deployment configuration
├── package.json              # Dependencies and scripts
├── server.js                 # Local development server (Node.js)
├── DEPLOYMENT_GUIDE.md       # Step-by-step deployment instructions
├── HOSTING_GUIDE.md          # Hosting options comparison
└── README.md                 # This documentation
```

## 🚀 Deployment

### Current Deployment: Netlify
The website is deployed on Netlify with automatic deployments from GitHub.

**Deployment URL**: `https://minh-dai-wedding-2026.netlify.app`

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/paulminhdai/minh-dai-wedding.git
   cd minh-dai-wedding
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local server:**
   ```bash
   npm start
   # or
   node server.js
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Wedding Details
Update these key details in the code:

1. **Wedding Date** (`public/main.js`):
   ```javascript
   weddingDate: new Date('2026-06-26T00:00:00-07:00')
   ```

2. **Venues** (`public/index.html`):
   - Korean Martys Catholic Center (Ceremony)
   - White Place 2 (Reception)

3. **Schedule** (`public/index.html`):
   - 2:30 PM - Tea Ceremony
   - 2:30 PM - Wedding Mass
   - 6:00 PM - Cocktail Hour
   - 7:00 PM - Reception

### Theme Colors
The vintage blue & gold palette is defined in CSS custom properties:

```css
:root {
  --primary: #2c3e50;           /* Neptune Navy */
  --accent-blue: #7fb3d3;       /* Dusty Blue */
  --accent-blue-light: #a8c0d4; /* Light Dusty Blue */
  --accent-sage: #9caf88;       /* Sage Green */
  --accent-gold: #d4af37;       /* Brass/Gold */
  --neutral: #8e9aaf;           /* Soft Gray */
## 📝 RSVP System

### Serverless Function (Netlify)
The RSVP system uses Netlify Functions for serverless processing:

- **Endpoint**: `/.netlify/functions/rsvp`
- **Method**: POST
- **Features**: Input validation, phone number validation, CORS enabled
- **Security**: Input sanitization, error handling

### RSVP Data Structure
```json
{
  "names": "John & Jane Doe",
  "phone": "(555) 123-4567",
  "attending": "yes",
  "guests": 2,
  "dietary": "No nuts",
  "message": "Looking forward to celebrating!",
  "timestamp": "2025-08-07T12:00:00.000Z"
}
```

### Current Storage
RSVPs are currently logged to Netlify Function logs. For production use, consider:
- **Airtable**: Easy database with forms
- **Google Sheets**: Direct integration with Google Sheets API
- **SendGrid**: Email notifications for each RSVP
- **Supabase**: Real-time database with dashboard

## 🎨 Customization

### Adding Your Photos
1. Replace images in `public/images/` folder
2. Update image names in the JavaScript gallery configuration
3. Optimize images for web (recommended: WebP format, max 1MB each)

### Updating Content
1. **Your Story**: Edit the story section in `public/index.html`
2. **Wedding Details**: Update venue information, schedule, and FAQ
3. **Contact Info**: Modify meta tags and contact details

### Color Scheme
To change the color palette, update CSS custom properties in `public/styles.css`:

```css
:root {
  /* Your custom colors */
  --primary: #your-color;
  --accent-blue: #your-color;
  /* etc... */
}
```

## 🔒 Security Features

- **Input Sanitization**: All form inputs are sanitized to prevent XSS
- **CORS Protection**: Configured for secure cross-origin requests  
- **Rate Limiting**: RSVP submissions limited to prevent abuse
- **HTTPS**: Automatic SSL certificate through Netlify
- **Content Security**: Security headers configured in netlify.toml

## 🚀 Performance Optimizations

- **Lazy Loading**: Images load only when visible
- **Service Worker**: Offline caching and PWA functionality
- **Minified Assets**: Optimized CSS and JavaScript
- **CDN**: Global content delivery through Netlify's CDN
- **Responsive Images**: Optimized images for different screen sizes

## 📱 Progressive Web App

The website includes PWA features:
- **App Manifest**: Can be installed on mobile devices
- **Service Worker**: Works offline with cached content
- **App Icons**: Custom wedding-themed app icons
- **Splash Screen**: Beautiful loading experience

## 🔍 SEO & Analytics

- **Structured Data**: JSON-LD schema for rich search results
- **Meta Tags**: Complete Open Graph and Twitter Card support
- **Semantic HTML**: Proper heading hierarchy and ARIA labels
- **Sitemap Ready**: Search engine friendly structure

## 📊 Monitoring & Analytics

### Netlify Analytics
- View deployment status and build logs
- Monitor function execution and errors
- Track site performance metrics

### RSVP Tracking
Currently RSVPs are logged to Netlify Functions. To implement proper tracking:

1. **Add email notifications**:
   ```javascript
   // In netlify/functions/rsvp.js
   const sgMail = require('@sendgrid/mail');
   await sgMail.send({
     to: 'your-email@example.com',
     subject: 'New RSVP Received',
     text: `New RSVP from ${sanitizedData.names}`
   });
   ```

2. **Google Sheets integration**:
   ```javascript
   const { GoogleSpreadsheet } = require('google-spreadsheet');
   // Add RSVP data to spreadsheet
   ```

## 🛠️ Development

### Local Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start local server: `npm start` or `node server.js`
4. Visit `http://localhost:3000`

### Making Changes
1. Edit files locally
2. Test changes on localhost:3000
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
4. Netlify automatically deploys changes (1-2 minutes)

### Testing RSVP Form
1. Fill out the form on your local or live site
2. Check Netlify Functions logs for RSVP data
3. Verify form validation and error handling

## 📚 Additional Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Complete deployment instructions
- **[HOSTING_GUIDE.md](HOSTING_GUIDE.md)**: Comparison of hosting options
- **[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)**: Guest list integration guide

## 🆘 Troubleshooting

### Common Issues

1. **Page not found (404)**:
   - Check Netlify build settings: publish directory = `public`
   - Verify all files are pushed to GitHub
   - Check deploy logs for errors

2. **RSVP form not working**:
   - Check Netlify Functions logs
   - Verify CORS settings
   - Test with browser developer tools

3. **Images not loading**:
   - Ensure images are in `public/images/` folder
   - Check file paths in HTML/CSS
   - Verify images are pushed to GitHub

4. **Styling issues**:
   - Clear browser cache
   - Check CSS file path
   - Verify CSS custom properties support

### Getting Help

- **Netlify Documentation**: [docs.netlify.com](https://docs.netlify.com)
- **GitHub Issues**: Report bugs in the repository
- **Netlify Community**: [community.netlify.com](https://community.netlify.com)

## 📄 License

This project is open source and available under the MIT License.

## 🎉 Credits

Built with love for Minh & Đại's special day! 💙💛

**Technologies Used**:
- Vanilla JavaScript (ES6+)
- CSS3 with Custom Properties
- HTML5 with Semantic Markup
- Netlify Functions (Node.js)
- Progressive Web App features
- Google Fonts (Playfair Display & Inter)
- Rate limiting on RSVP submissions
- Duplicate prevention by name + email
- Guest list verification (optional)
- Basic admin authentication

## Accessibility Features

- Semantic HTML structure
- Proper ARIA labels and roles
- Focus management and trap for mobile menu
- High contrast mode toggle
- Reduced motion respect
- Screen reader friendly
- Keyboard navigation support

## Performance Optimizations

- Mobile-first responsive design
- Lazy loading for images
- Debounced form validation
- Minimal vanilla JavaScript (no frameworks)
- Service Worker for caching
- Optimized CSS with custom properties

## Browser Support

- Modern browsers (ES6+ features used)
- Progressive enhancement for older browsers
- Service Worker support detection
- Graceful fallbacks for missing features

## Deployment

The website is designed to be easily deployed to:
- **Heroku**: Add `PORT` environment variable support
- **Vercel**: Works with Node.js runtime
- **Railway**: Direct deployment support
- **DigitalOcean**: App Platform compatible
- **AWS**: Elastic Beanstalk or EC2

### Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production         # Environment
```

## Customization Ideas

### Add Real Images
Replace placeholder images in:
- Wedding party photos
- Gallery section
- Hero background image

### Analytics Integration
Add tracking code in `public/main.js`:
```javascript
const Analytics = {
    init() {
        // Add Google Analytics, Facebook Pixel, etc.
    }
};
```

### Additional Features
- Photo gallery with lightbox
- Livestream integration
- Gift registry API integration
- Email notifications for RSVPs
- Wedding hashtag social feed

## File Storage

RSVPs are stored in `data/rsvps.json`. For production, consider:
- Database integration (MongoDB, PostgreSQL)
- Cloud storage (AWS S3, Google Cloud)
- Backup strategies

## Development

For development with auto-reload:
```bash
npm install nodemon --save-dev
npm run dev
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
killall -9 node
# Or use different port
PORT=3001 node server.js
```

### Permission Errors
Ensure the server has write permissions to the `data/` directory.

### RSVP Not Working
1. Check browser console for errors
2. Verify server is running
3. Check network tab for API responses
4. Ensure `data/` directory exists

## License

This project is open source and available under the ISC License.

## Support

For questions or issues:
1. Check the browser console for errors
2. Review server logs
3. Verify all dependencies are installed
4. Ensure proper file permissions

---

**Note**: This is a complete, production-ready wedding website. Update the placeholder content with your actual wedding details, photos, and personal information.
