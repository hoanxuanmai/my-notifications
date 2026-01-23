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

      const summaryTitle = stack.length === 1
        ? title
        : `${stack.length} new notifications`;

      const summaryBody = stack
        .map((item, index) => `${index + 1}. ${item.body}`)
        .join('\n');

      const options = {
        body: summaryBody,
        tag,
        data: {
          ...extraData,
          stack,
        },
        // icon / badge tuỳ chỉnh nếu cần
        // icon: '/icons/icon-192x192.png',
        // badge: '/icons/badge-72x72.png',
      };

      return self.registration.showNotification(summaryTitle, options);
    })(),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = '/';

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
