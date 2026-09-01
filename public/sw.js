// ==============================================================================
// MY-NOTIFICATIONS SERVICE WORKER (WebPush Protocol Handler)
// Compatible with NestJS web-push and Supabase Edge Functions
// ==============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle Incoming Web Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push Received:', event);

  let data = {
    title: 'New Notification',
    body: 'You have a new update from Notification Hub',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: 'default-tag',
    data: {
      url: '/',
    },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    badge: data.badge || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64&auto=format&fit=crop&q=80',
    image: data.image,
    tag: data.tag || 'general-notif-' + Date.now(),
    data: data.data || { url: data.actionUrl || '/' },
    actions: data.actions || [
      { action: 'open_app', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: data.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks (Opening the App / Navigating)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification Clicked:', event.notification.tag, event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification was closed without interaction', event.notification.tag);
});
