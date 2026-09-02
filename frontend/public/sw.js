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

  const title = data.title || 'Notification';
  const body = data.body || '';
  const extraData = data.data || {};

  // Hiển thị dạng "stack": gộp nhiều web push lại trong 1 notification,
  // cập nhật nội dung mỗi lần có tin mới thay vì tạo nhiều notification rời.
  event.waitUntil(
    (async () => {
      const tag = 'dev-notification-stack';

      // Lấy notification stack hiện tại (nếu có)
      const existing = await self.registration.getNotifications({ tag });
      let stack = [];

      if (existing.length > 0 && existing[0].data && Array.isArray(existing[0].data.stack)) {
        stack = existing[0].data.stack;
      }

      // Thêm tin mới lên đầu stack
      stack.unshift({
        title,
        body,
        receivedAt: Date.now(),
      });

      // Giới hạn số tin hiển thị trong stack (ví dụ 5)
      stack = stack.slice(0, 5);

      // Đóng notification cũ (nếu có) để thay bằng bản mới
      existing.forEach((n) => n.close());

      // Hiển thị từng notification riêng biệt theo stack
      await Promise.all(
        stack.map((item, idx) => {
          const options = {
            body: item.body,
            tag: tag + '-' + idx,
            data: {
              ...extraData,
              stack,
              receivedAt: item.receivedAt,
            },
            // icon / badge tuỳ chỉnh nếu cần
            // icon: '/icons/icon-192x192.png',
            // badge: '/icons/badge-72x72.png',
          };
          return self.registration.showNotification(item.title || title, options);
        })
      );
      return;
    })(),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  let targetUrl = '/';

  try {
    const data = event.notification && event.notification.data ? event.notification.data : {};
    if (data && data.channelId) {
      const encodedChannelId = encodeURIComponent(data.channelId);
      targetUrl = '/?channelId=' + encodedChannelId;
    }
  } catch (e) {
    // Fallback to default URL if anything goes wrong
    targetUrl = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
