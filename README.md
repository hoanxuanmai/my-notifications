# Hệ Thống Thông Báo Thời Gian Thực (Notification Service)

Hệ thống thông báo toàn diện chuyển đổi từ kiến trúc NestJS sang **Supabase Serverless** (PostgreSQL + RLS, Stored Procedures RPC, Deno Edge Functions, Webhooks Ingestion, và Realtime WebSockets).

---

## 1. Bảng Đối Chiếu Endpoints: NestJS vs. Supabase

| STT | Endpoint NestJS Cũ | Method | Chức năng | Phương thức kết nối Supabase (Mới) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `/auth/register` | `POST` | Đăng ký tài khoản | `supabase.auth.signUp()` | ✅ Sẵn sàng |
| **2** | `/auth/login` | `POST` | Đăng nhập tài khoản | `supabase.auth.signInWithPassword()` | ✅ Sẵn sàng |
| **3** | `/users/me` | `GET` | Lấy profile người dùng hiện tại | `supabase.auth.getUser()` | ✅ Sẵn sàng |
| **4** | `/users` | `GET` | Quản trị danh sách người dùng | `supabase.rpc('get_admin_users')` | ✅ Sẵn sàng |
| **5** | `/users/:id` | `DELETE` | Xóa người dùng (Admin) | `supabase.rpc('admin_delete_user', { p_user_id })` | ✅ Sẵn sàng |
| **6** | `/users/me/webpush-devices` | `GET` | Danh sách thiết bị nhận Web Push | `supabase.from('push_subscriptions').select('*')` | ✅ Sẵn sàng |
| **7** | `/users/me/webpush-devices/:id` | `DELETE` | Hủy đăng ký thiết bị Web Push | `supabase.from('push_subscriptions').delete().eq('id', id)` | ✅ Sẵn sàng |
| **8** | `/channels` | `POST` | Tạo kênh mới (sinh Webhook token) | `supabase.rpc('create_channel', { p_name, p_description, p_settings })` | ✅ Sẵn sàng |
| **9** | `/channels` | `GET` | Danh sách kênh người dùng tham gia | `supabase.rpc('get_user_channels')` hoặc `supabase.from('channels').select('*')` | ✅ Sẵn sàng |
| **10** | `/channels/:id` | `GET` | Xem chi tiết kênh | `supabase.from('channels').select('*').eq('id', id).single()` | ✅ Sẵn sàng |
| **11** | `/channels/:id` | `PATCH` | Cập nhật kênh | `supabase.from('channels').update({...}).eq('id', id)` | ✅ Sẵn sàng |
| **12** | `/channels/:id` | `DELETE` | Xóa kênh | `supabase.from('channels').delete().eq('id', id)` | ✅ Sẵn sàng |
| **13** | `/channels/:id/members` | `POST` | Mời thành viên bằng Email | `supabase.rpc('add_channel_member_by_email', { p_channel_id, p_email })` | ✅ Sẵn sàng |
| **14** | `/channels/:id/members` | `GET` | Danh sách thành viên kênh | `supabase.from('channel_members').select('*').eq('channel_id', id)` | ✅ Sẵn sàng |
| **15** | `/channels/:id/members/:userId` | `DELETE` | Xóa thành viên khỏi kênh | `supabase.rpc('remove_channel_member', { p_channel_id, p_member_user_id })` | ✅ Sẵn sàng |
| **16** | `/notifications` | `GET` | Danh sách thông báo | `supabase.from('notifications').select('*').order('created_at', { ascending: false })` | ✅ Sẵn sàng |
| **17** | `/notifications/unread/count` | `GET` | Đếm số thông báo chưa đọc | `supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false)` | ✅ Sẵn sàng |
| **18** | `/notifications/unread/summary`| `GET` | Thống kê chưa đọc theo từng kênh | `supabase.rpc('get_unread_summary_by_channel')` | ✅ Sẵn sàng |
| **19** | `/notifications/:id` | `GET` | Chi tiết 1 thông báo | `supabase.from('notifications').select('*').eq('id', id).single()` | ✅ Sẵn sàng |
| **20** | `/notifications/:id/read` | `PUT` | Đánh dấu 1 thông báo đã đọc | `supabase.from('notifications').update({ read: true, is_read: true, read_at: new Date() }).eq('id', id)` | ✅ Sẵn sàng |
| **21** | `/notifications/read-all` | `PUT` | Đánh dấu tất cả đã đọc | `supabase.rpc('mark_channel_notifications_read', { p_channel_id })` | ✅ Sẵn sàng |
| **22** | `/notifications/:id` | `DELETE` | Xóa thông báo | `supabase.from('notifications').delete().eq('id', id)` | ✅ Sẵn sàng |
| **23** | `/webhooks/:webhookToken` | `POST` | Ingest Webhook từ bên thứ ba | **Edge Function**: `POST https://<project-ref>.supabase.co/functions/v1/webhooks/:token` | ✅ Sẵn sàng |
| **24** | `/push/subscribe` | `POST` | Đăng ký nhận Web Push (Browser) | `supabase.from('push_subscriptions').upsert(...)` + Edge Function `send-webpush` | ✅ Sẵn sàng |
| **25** | `WebSocket: subscribe:channel` | `WS` | Lắng nghe thông báo kênh thời gian thực | `supabase.channel('channel-events').on('postgres_changes', ...)` | ✅ Sẵn sàng |
| **26** | `Cron Cleanup TTL` | `CRON` | Tự động dọn dẹp thông báo hết hạn | `supabase.rpc('cleanup_expired_records')` + `pg_cron` (2:00 AM) | ✅ Sẵn sàng |

---

## 2. Hướng Dẫn Chi Tiết Kết Nối Cho Frontend (FE API Reference)

### 2.1. Cài đặt SDK
```bash
npm install @supabase/supabase-js
```

Khởi tạo client:
```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const SUPABASE_ANON_KEY = '<your-anon-key>';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

### 2.2. Xác Thực Người Dùng (Authentication)
```typescript
// 1. Đăng ký tài khoản
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'Password123!',
});

// 2. Đăng nhập
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'Password123!',
});

// 3. Lấy User hiện tại
const { data: { user } } = await supabase.auth.getUser();

// 4. Đăng xuất
await supabase.auth.signOut();
```

---

### 2.3. Quản Lý Kênh (Channels)
```typescript
// 1. Tạo kênh mới (Tự động sinh Webhook token bảo mật)
const { data: channel, error } = await supabase.rpc('create_channel', {
  p_name: 'Production Monitoring',
  p_description: 'Kênh cảnh báo hệ thống production',
  p_settings: { color: 'rose', icon: 'server' }
});

// 2. Lấy danh sách kênh của người dùng (kèm số lượng unread)
const { data: channels, error } = await supabase.rpc('get_user_channels');

// 3. Mời thành viên vào kênh bằng Email
const { data: member, error } = await supabase.rpc('add_channel_member_by_email', {
  p_channel_id: 'channel-uuid-here',
  p_email: 'teammate@company.com'
});

// 4. Xóa thành viên khỏi kênh
const { data, error } = await supabase.rpc('remove_channel_member', {
  p_channel_id: 'channel-uuid-here',
  p_member_user_id: 'user-uuid-here'
});
```

---

### 2.4. Quản Lý Thông Báo (Notifications)
```typescript
// 1. Lấy danh sách thông báo (phân trang và lọc theo kênh)
const { data: notifications, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('channel_id', 'channel-uuid-here') // (tùy chọn)
  .order('created_at', { ascending: false })
  .limit(30);

// 2. Thống kê số lượng chưa đọc theo từng kênh (Tối ưu hóa badge)
const { data: summary, error } = await supabase.rpc('get_unread_summary_by_channel');
// Kết quả trả về: [{ channelId, channelName, unreadCount, totalCount, lastNotificationAt }, ...]

// 3. Đánh dấu 1 thông báo đã đọc
await supabase
  .from('notifications')
  .update({ read: true, is_read: true, read_at: new Date().toISOString() })
  .eq('id', 'notification-uuid-here');

// 4. Đánh dấu tất cả thông báo trong kênh là đã đọc
await supabase.rpc('mark_channel_notifications_read', {
  p_channel_id: 'channel-uuid-here' // Để null nếu muốn mark toàn bộ
});

// 5. Gửi thông báo vào kênh từ Client/Admin
const { data, error } = await supabase.rpc('send_channel_notification', {
  p_channel_id: 'channel-uuid-here',
  p_title: 'Server CPU High',
  p_message: 'CPU usage exceeded 90% on node-01',
  p_type: 'warning',
  p_priority: 'high',
  p_metadata: { host: 'node-01', cpu: 92 },
  p_ttl_days: 3
});
```

---

### 2.5. Ingest Webhook từ Bên Thứ Ba (Edge Function: `webhooks`)
Các dịch vụ bên ngoài (GitHub Actions, Grafana, Sentry, CI/CD, Stripe) gửi HTTP POST tới:

- **Đường dẫn**: `https://<your-project-ref>.supabase.co/functions/v1/webhooks/<WEBHOOK_TOKEN>`
- **Phương thức**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body JSON**:
```json
{
  "title": "Deployment Succeeded",
  "message": "Release v2.4.0 successfully deployed to production.",
  "type": "success",
  "priority": "normal",
  "actionUrl": "https://dashboard.example.com/deployments/123",
  "actionLabel": "Xem Deployment",
  "metadata": {
    "env": "production",
    "commit": "a1b2c3d"
  }
}
```

---

### 2.6. Lắng Nghe Thời Gian Thực (Supabase Realtime WebSocket)
```typescript
// Lắng nghe tất cả sự kiện thêm mới hoặc cập nhật thông báo
const subscription = supabase
  .channel('realtime_notifications')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'notifications',
    },
    (payload) => {
      console.log('Realtime notification update:', payload);
      if (payload.eventType === 'INSERT') {
        // Thêm thông báo mới vào danh sách trên UI
      } else if (payload.eventType === 'UPDATE') {
        // Cập nhật trạng thái đã đọc trên UI
      }
    }
  )
  .subscribe();

// Hủy đăng ký khi component unmount
// supabase.removeChannel(subscription);
```

---

### 2.7. Web Push Notifications (Browser VAPID)
```typescript
// 1. Đăng ký Service Worker & lưu PushSubscription vào Supabase
const sub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlB64ToUint8Array('<PUBLIC_VAPID_KEY>')
});

const subJson = sub.toJSON();

await supabase.from('push_subscriptions').upsert({
  user_id: user.id,
  endpoint: subJson.endpoint,
  p256dh: subJson.keys?.p256dh,
  auth: subJson.keys?.auth,
  user_agent: navigator.userAgent,
  updated_at: new Date().toISOString()
});

// 2. Gửi Web Push qua Edge Function
await fetch('https://<project-ref>.supabase.co/functions/v1/send-webpush', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    title: 'Cảnh báo bảo mật',
    message: 'Phát hiện đăng nhập từ IP mới',
    url: '/security'
  })
});
```

---

### 2.8. Tùy Chọn Nhận Thông Báo (User Preferences)
```typescript
// Lấy cấu hình của người dùng
const { data: prefs } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', user.id)
  .single();

// Cập nhật cấu hình
await supabase.from('notification_preferences').upsert({
  user_id: user.id,
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: false,
  sound_enabled: true,
  quiet_hours_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  frequency: 'instant',
  updated_at: new Date().toISOString()
});
```
