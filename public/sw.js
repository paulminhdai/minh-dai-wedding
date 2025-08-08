// Service Worker for Wedding Website
// Provides basic offline functionality and asset caching

const CACHE_NAME = 'wedding-website-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                // Claim control of all clients
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle different types of requests
    if (request.method === 'GET') {
        if (url.pathname.startsWith('/api/')) {
            // API requests - try network first, then show offline message
            event.respondWith(handleApiRequest(request));
        } else {
            // Static assets - cache first, then network
            event.respondWith(handleStaticRequest(request));
        }
    }
});

// Handle API requests
async function handleApiRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // Network failed - return offline response
        return new Response(
            JSON.stringify({
                error: 'You appear to be offline. Please check your connection and try again.',
                offline: true
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

// Handle static asset requests
async function handleStaticRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Cache miss - try network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed - try to serve from cache or fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // No cache available - return offline page
        return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Emily & James Wedding</title>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background-color: #f9fafb;
                        color: #1f2937;
                        text-align: center;
                        padding: 2rem;
                    }
                    .offline-container {
                        max-width: 500px;
                    }
                    h1 {
                        font-family: 'Playfair Display', serif;
                        font-size: 2rem;
                        margin-bottom: 1rem;
                        color: #1e3a8a;
                    }
                    p {
                        font-size: 1.125rem;
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }
                    .btn {
                        display: inline-block;
                        padding: 0.75rem 2rem;
                        background-color: #1e3a8a;
                        color: white;
                        text-decoration: none;
                        border-radius: 0.5rem;
                        font-weight: 500;
                        transition: background-color 0.2s;
                    }
                    .btn:hover {
                        background-color: #1e40af;
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <h1>You're Offline</h1>
                    <p>It looks like you're not connected to the internet. Please check your connection and try again.</p>
                    <a href="/" class="btn" onclick="window.location.reload()">Try Again</a>
                </div>
            </body>
            </html>`,
            {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'text/html'
                }
            }
        );
    }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
        
        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME)
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                })
                .catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            break;
        
        default:
            console.log('Unknown message type:', type);
    }
});

// Background sync for RSVP submissions (if supported)
if ('sync' in self.registration) {
    self.addEventListener('sync', (event) => {
        if (event.tag === 'rsvp-sync') {
            event.waitUntil(syncRSVPs());
        }
    });
}

// Sync pending RSVPs when back online
async function syncRSVPs() {
    try {
        // This would handle offline RSVP submissions
        // For now, just log that sync is available
        console.log('Background sync available for RSVP submissions');
    } catch (error) {
        console.error('Error syncing RSVPs:', error);
    }
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        data: data.url
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.data) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});
