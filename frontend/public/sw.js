self.addEventListener('install', (event) => {
  // Activate updated SW immediately without waiting for old one to be closed
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients as soon as the SW activates
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notification', body: event.data.text() };
    }
  }

  const title = data.title || 'Webhook Alert';
  const body = data.body || data.message || 'You received a new notification';
  const extraData = data.data || {};
  const channelId = data.channelId || extraData.channelId;
  const tag = data.tag || (channelId ? 'ch-' + channelId : 'alert-' + Date.now());

  const options = {
    body: body,
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: data.badge || '/icons/icon-192x192.svg',
    tag: tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      ...extraData,
      channelId: channelId,
      url: data.action_url || extraData.url || (channelId ? '/?channelId=' + encodeURIComponent(channelId) : '/'),
      receivedAt: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  let targetUrl = '/';

  try {
    const data = event.notification && event.notification.data ? event.notification.data : {};
    if (data && data.url) {
      targetUrl = data.url;
    } else if (data && data.channelId) {
      targetUrl = '/?channelId=' + encodeURIComponent(data.channelId);
    }
  } catch (e) {
    targetUrl = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
