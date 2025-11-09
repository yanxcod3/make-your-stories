// Cache names
const CACHE_NAME = 'make-your-stories-v2';
const RUNTIME_CACHE = 'runtime-cache-v2';
const IMAGE_CACHE = 'image-cache-v2';
const API_CACHE = 'api-cache-v2';

// Assets to cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app.bundle.js',
  '/manifest.json',
  '/images/logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Image requests from Dicoding API - Cache First (must be before API check)
  if (url.pathname.includes('/images/') || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // API requests - Network First with Cache Fallback
  if (url.href.includes('/v1/stories') || url.href.includes('/v1/login') || url.href.includes('/v1/register')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE)
    );
    return;
  }

  // App shell and static assets - Cache First
  event.respondWith(
    cacheFirstStrategy(request, CACHE_NAME)
  );
});

// Network First Strategy - for dynamic content like API calls
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      // Clone the response because it can only be used once
      cache.put(request, response.clone());
      
      // If this is a stories API response, also cache the images
      if (request.url.includes('/v1/stories')) {
        cacheStoryImages(response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('Network request failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Returning cached response for:', request.url);
      return cachedResponse;
    }
    
    // Return a custom offline response for API requests
    if (request.url.includes('/v1/stories')) {
      return new Response(
        JSON.stringify({
          error: false,
          message: 'Offline - showing cached data',
          listStory: []
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache images from story data
async function cacheStoryImages(response) {
  try {
    const data = await response.json();
    const stories = data.listStory || [];
    const imageCache = await caches.open(IMAGE_CACHE);
    
    for (const story of stories) {
      if (story.photoUrl) {
        try {
          const imageResponse = await fetch(story.photoUrl);
          if (imageResponse.ok) {
            await imageCache.put(story.photoUrl, imageResponse);
          }
        } catch (err) {
          console.log('Failed to cache image:', story.photoUrl);
        }
      }
    }
  } catch (err) {
    // Silent fail - JSON parsing might fail, that's okay
  }
}

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request, cacheName);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Fetch failed for:', request.url, error);
    
    // Return a fallback for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/index.html');
    }
    
    // Return a fallback for images
    if (request.destination === 'image' || 
        request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        request.url.includes('story-api.dicoding.dev')) {
      // Return a simple SVG placeholder
      return new Response(
        `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#e0e0e0"/>
          <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#757575" text-anchor="middle" dy="0">
            Gambar tidak tersedia
          </text>
          <text x="50%" y="60%" font-family="Arial" font-size="14" fill="#9e9e9e" text-anchor="middle" dy="0">
            (Mode Offline)
          </text>
        </svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    throw error;
  }
}

// Update cache in background (Stale While Revalidate pattern)
async function updateCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
  } catch (error) {
    return null;
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? JSON.parse(event.data.text()) : {};
  } catch (e) {
    console.warn('Invalid JSON, using fallback');
    data = { title: 'New Notification', body: event.data?.text() || 'You have a new message' };
  }

  const title = data.title || 'Make Your Stories';
  const options = {
    body: data.body || data.options?.body || 'Notification received',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-96x96.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: 'story-notification',
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const client = clientsArr.find(c => c.url.includes(url) && 'focus' in c);
      return client ? client.focus() : clients.openWindow(url);
    })
  );
});

// Background sync event (for future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncStories());
  }
});

async function syncStories() {
  try {
    console.log('Background sync: syncing stories');
    // This can be enhanced to sync offline changes
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
