# Wedding Website - Emily & James

A modern, fast, and fully responsive wedding website built with vanilla JavaScript, CSS, and Node.js/Express.

## Features

- ✨ **Modern Design**: Elegant minimal design with navy blue theme, serif headings, and subtle floral accents
- 📱 **Fully Responsive**: Mobile-first design that works on all devices
- ⚡ **Fast Performance**: No large frameworks, optimized vanilla JavaScript
- ♿ **Accessible**: Semantic HTML, proper ARIA labels, focus management, high contrast toggle
- 🌙 **Dark/Light Theme**: System-aware theme toggle with localStorage persistence
- 📝 **RSVP System**: Complete form with validation, duplicate prevention, and file persistence
- 👥 **Guest Management**: Optional guest list verification with fuzzy matching
- 🗓️ **Live Countdown**: Real-time countdown to wedding date
- 🚀 **PWA Ready**: Service worker for offline support, manifest for app-like experience
- 🔒 **Security**: Input sanitization, rate limiting, XSS prevention
- 📊 **Analytics Ready**: Placeholder for tracking implementation

## Structure

```
wedding/
├── public/                 # Static assets served by Express
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS with mobile-first responsive design
│   ├── main.js           # Vanilla JavaScript (no frameworks)
│   ├── sw.js             # Service Worker for offline support
│   └── manifest.json     # PWA manifest
├── data/                  # Data storage
│   ├── guests.txt        # Optional guest list for RSVP validation
│   └── rsvps.json        # RSVP responses (auto-created)
├── server.js             # Express server with RSVP API
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install express express-rate-limit
   ```

2. **Start the server:**
   ```bash
   node server.js
   ```

3. **Open your browser:**
   ```
   http://localhost:3000
   ```

## Configuration

### Wedding Details
Edit the following in `public/index.html`:
- Couple names in the hero section
- Wedding date and time
- Venue addresses
- Wedding party members
- Timeline/schedule

### Wedding Date
Update the countdown timer in `public/main.js`:
```javascript
const CONFIG = {
    weddingDate: new Date('2026-06-26T16:00:00-07:00'), // Update this date
    // ...
};
```

### Guest List (Optional)
To restrict RSVPs to invited guests only:
1. Add names to `data/guests.txt` (one per line)
2. The system uses fuzzy matching for name verification
3. If the file doesn't exist, anyone can RSVP

### Styling
Customize colors and fonts in `public/styles.css`:
```css
:root {
  --primary: #1e3a8a;        /* Navy blue */
  --accent-pink: #fecaca;     /* Blush pink */
  --accent-green: #86efac;    /* Sage green */
  /* ... */
}
```

## API Endpoints

### POST /api/rsvp
Submit RSVP form data. Rate limited to 5 requests per 15 minutes per IP.

**Request:**
```json
{
  "guestCode": "optional",
  "names": "John & Jane Doe",
  "email": "john@example.com",
  "attending": "yes",
  "mealChoice": "chicken",
  "dietary": "No nuts",
  "songRequest": "Dancing Queen"
}
```

**Response:**
```json
{
  "message": "Thank you for your RSVP!",
  "id": "unique-id"
}
```

### GET /api/admin/rsvps?password=wedding2026admin
View all RSVPs (password protected). Change the password in `server.js`.

### GET /api/health
Health check endpoint.

## Security Features

- Input sanitization to prevent XSS attacks
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
