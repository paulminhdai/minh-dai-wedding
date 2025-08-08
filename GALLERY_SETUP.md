# How to Add Photos to Your Wedding Gallery 📸

## Quick Setup

1. **Add your photos** to the `public/images/` folder
2. **Name your photos** as: `photo1.jpg`, `photo2.jpg`, `photo3.jpg`, etc.
3. **Update the list** in `public/main.js` if you want different filenames

## Step-by-Step Instructions

### 1. Prepare Your Photos
- **Recommended size**: 1200x1200 pixels (square) or 1200x800 pixels (landscape)
- **Format**: JPG or PNG
- **File size**: Keep under 2MB each for fast loading

### 2. Add Photos to the Images Folder
Copy your wedding photos to: `/Users/d0v04jq/Desktop/test/wedding/public/images/`

### 3. Update the Gallery List (if needed)
If you want custom filenames, edit the `galleryImages` array in `main.js`:

```javascript
const galleryImages = [
    'images/engagement-shoot.jpg',
    'images/proposal.jpg',
    'images/save-the-date.jpg',
    'images/venue-exterior.jpg',
    'images/flowers.jpg',
    'images/rings.jpg'
    // Add more photos as needed
];
```

## Features Included ✨

- **Responsive Grid**: Photos automatically adjust to screen size
- **Lazy Loading**: Photos load as users scroll
- **Lightbox View**: Click any photo to view it full-screen
- **Hover Effects**: Beautiful animations on hover
- **Error Handling**: Missing photos won't break the gallery

## Example File Structure
```
public/
├── images/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   ├── photo3.jpg
│   ├── photo4.jpg
│   ├── photo5.jpg
│   └── photo6.jpg
└── main.js (contains the photo list)
```

## Alternative: Online Photo Services

Instead of local images, you can also use:
- **Google Photos**: Get shareable links
- **Imgur**: Upload and use direct links
- **Wedding photo services**: Many provide embed codes

Just replace the image paths in `main.js` with the online URLs.

## Tips for Best Results 💡

1. **Optimize photos** before uploading (compress them)
2. **Use consistent aspect ratios** for the best grid layout
3. **Start with 6-12 photos** to keep loading fast
4. **Add photos gradually** as you get more wedding content

The gallery is now ready to showcase your beautiful wedding photos! 🎉
