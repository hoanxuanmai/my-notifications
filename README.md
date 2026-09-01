# Bảng Đối Chiếu Endpoints: NestJS Backend vs. Supabase

Tài liệu này tổng hợp toàn bộ các Endpoint đã phát triển trên NestJS trước đây, đối chiếu với kiến trúc Supabase tương đương (Database Table + RLS, Stored Procedure RPC, Edge Functions, Realtime WAL), đánh giá trạng thái hiện tại và liệt kê lộ trình các việc cần bổ sung theo trình tự ưu tiên.

---

## 1. Bảng Đối Chiếu Chi Tiết Từng Module

### 1.1. Module Xác Thực (Auth)
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/auth/register` | `POST` | Đăng ký tài khoản người dùng mới | `supabase.auth.signUp()` (Email + Password) | ✅ Hoàn thành |
| 2 | `/auth/login` | `POST` | Đăng nhập và nhận JWT token | `supabase.auth.signInWithPassword()` | ✅ Hoàn thành |

---

### 1.2. Module Người Dùng (Users)
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái | Ghi chú / Cần bổ sung |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | `/users` | `POST` | Tạo người dùng (Admin) | `supabase.auth.admin.createUser()` | ✅ Hoàn thành |
| 4 | `/users` | `GET` | Danh sách người dùng | Query `public.users` hoặc `auth.users` | ⚠️ Cần bổ sung | Cần view/query an toàn có RLS cho Admin |
| 5 | `/users/me` | `GET` | Lấy profile người dùng hiện tại | `supabase.auth.getUser()` + query `public.users` | ✅ Hoàn thành |
| 6 | `/users/:id` | `GET` | Lấy thông tin 1 người dùng | `supabase.from('users').select().eq('id', id)` | ✅ Hoàn thành |
| 7 | `/users/:id` | `PATCH` | Cập nhật profile người dùng | `supabase.from('users').update(...)` | ✅ Hoàn thành |
| 8 | `/users/:id` | `DELETE` | Xóa người dùng | `supabase.auth.admin.deleteUser()` | ⚠️ Cần bổ sung | RPC hoặc Edge Function cho Admin |
| 9 | `/users/me/webpush-devices` | `GET` | Danh sách thiết bị Push của user | `supabase.from('push_subscriptions').select()` | ✅ Hoàn thành |
| 10 | `/users/me/webpush-devices/:id` | `DELETE` | Xóa thiết bị Web Push | `supabase.from('push_subscriptions').delete().eq('id', id)` | ✅ Hoàn thành |

---

### 1.3. Module Kênh Thông Báo (Channels)
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 11 | `/channels` | `POST` | Tạo kênh mới (sinh webhook token) | `supabase.rpc('create_channel', {...})` | ✅ Hoàn thành |
| 12 | `/channels` | `GET` | Lấy danh sách kênh user tham gia | `supabase.from('channels').select('*')` (được bảo vệ bởi RLS) | ✅ Hoàn thành |
| 13 | `/channels/:id` | `GET` | Lấy chi tiết kênh | `supabase.from('channels').select('*').eq('id', id)` | ✅ Hoàn thành |
| 14 | `/channels/:id` | `PATCH` | Sửa thông tin kênh / đổi token | `supabase.from('channels').update(...)` (RLS Owner/Admin) | ✅ Hoàn thành |
| 15 | `/channels/:id` | `DELETE` | Xóa kênh | `supabase.from('channels').delete().eq('id', id)` | ✅ Hoàn thành |
| 16 | `/channels/:id/members` | `POST` | Mời thành viên bằng Email | `supabase.rpc('add_channel_member_by_email', {...})` | ✅ Hoàn thành |
| 17 | `/channels/:id/members` | `GET` | Xem danh sách thành viên kênh | `supabase.rpc('get_channel_members', { p_channel_id })` | ✅ Hoàn thành |
| 18 | `/channels/:id/members/:userId` | `DELETE` | Xóa thành viên khỏi kênh | `supabase.rpc('remove_channel_member', {...})` | ✅ Hoàn thành |

---

### 1.4. Module Thông Báo (Notifications)
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái | Ghi chú / Cần bổ sung |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 19 | `/notifications` | `GET` | Lấy danh sách thông báo (phân trang, filter channel, read/unread) | `supabase.from('notifications').select('*')` | ✅ Hoàn thành |
| 20 | `/notifications/unread/count` | `GET` | Đếm số lượng thông báo chưa đọc | `supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false)` | ✅ Hoàn thành |
| 21 | `/notifications/unread/summary` | `GET` | Thống kê số unread theo từng kênh | `supabase.rpc('get_unread_summary_by_channel')` | ⚠️ Cần bổ sung | Cần viết thêm RPC function để tối ưu truy vấn group by channel |
| 22 | `/notifications/:id` | `GET` | Chi tiết 1 thông báo | `supabase.from('notifications').select('*').eq('id', id)` | ✅ Hoàn thành |
| 23 | `/notifications/:id/read` | `PUT` | Đánh dấu 1 thông báo đã đọc | `supabase.from('notifications').update({ is_read: true }).eq('id', id)` | ✅ Hoàn thành |
| 24 | `/notifications/read-all` | `PUT` | Đánh dấu tất cả đã đọc (theo channel hoặc toàn bộ) | `supabase.rpc('mark_channel_notifications_read', { p_channel_id })` | ✅ Hoàn thành |
| 25 | `/notifications/:id` | `DELETE` | Xóa thông báo | `supabase.from('notifications').delete().eq('id', id)` | ✅ Hoàn thành |

---

### 1.5. Module Webhooks Ingestion
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 26 | `/webhooks/:webhookToken` | `POST` | Ingest Webhook từ bên thứ 3 theo token trên path | Edge Function `send-notification` (nhận `:token` qua path hoặc query) | ✅ Hoàn thành | Hỗ trợ cả `/api/webhooks/:token` và Edge Function |

---

### 1.6. Module Web Push
| STT | Endpoint NestJS | Method | Chức năng | Cơ chế tương đương trên Supabase | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 27 | `/push/subscribe` | `POST` | Đăng ký nhận Web Push (Browser VAPID) | `supabase.from('push_subscriptions').upsert(...)` + Edge Function `send-webpush` | ✅ Hoàn thành |

---

### 1.7. Module Realtime & WebSocket
| STT | Sự kiện / Chức năng NestJS | Cơ chế tương đương trên Supabase | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| 28 | `subscribe:channel` (Join room channel) | `supabase.channel('channel-events').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'channel_id=eq.ID' })` | ✅ Hoàn thành | Realtime WAL |
| 29 | `subscribe:user` (Join room cá nhân) | `supabase.channel('user-events').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.UID' })` | ✅ Hoàn thành | Realtime WAL |
| 30 | `channel:unread-updated` (Broadcast unread count) | Realtime Presence / Broadcast channel hoặc tính toán động từ event INSERT/UPDATE | ✅ Hoàn thành | |

---

### 1.8. Module Background Worker / Queue / Cron Cleanup
| STT | Chức năng NestJS | Cơ chế tương đương trên Supabase | Trạng thái | Ghi chú / Cần bổ sung |
| :--- | :--- | :--- | :--- | :--- |
| 31 | BullMQ Dispatch & Delivery Worker | Edge Function `send-notification` / Supabase Database Webhooks / pg_net | ✅ Hoàn thành | |
| 32 | Cron Cleanup: Xóa notifications & channels hết hạn TTL (`@Cron('0 2 * * *')`) | Supabase `pg_cron` Extension + SQL Procedure `cleanup_expired_records()` | ⚠️ Cần bổ sung | Cần viết file migration tạo `pg_cron` job chạy định kỳ tự động |

---

## 2. Danh Sách Những Hạng Mục Cần Bổ Sung (Action Items)

Dưới đây là các hạng mục cần bổ sung theo thứ tự ưu tiên để hoàn thiện 100% tính năng so với NestJS:

```
[ ] BƯỚC 1: RPC Function 'get_unread_summary_by_channel'
    - Mục đích: Trả về số lượng unread notifications theo từng channel_id của user hiện tại (thay thế GET /notifications/unread/summary).
    - Triển khai: Viết migration SQL tạo function có `SECURITY DEFINER` và phân nhóm theo `channel_id`.

[ ] BƯỚC 2: Cron Job Tự Động Dọn Dẹp Dữ Liệu Hết Hạn (pg_cron)
    - Mục đích: Tự động xóa các thông báo và kênh có `expires_at < NOW()` mỗi ngày lúc 2:00 AM (thay thế NestJS CleanupService).
    - Triển khai: Migration kích hoạt extension `pg_cron` và schedule job gọi `cleanup_expired_notifications()`.

[ ] BƯỚC 3: View & RPC Quản Trị Người Dùng (Admin Users API)
    - Mục đích: Cho phép tài khoản Admin xem danh sách user, trạng thái hoạt động và phân quyền an toàn theo RLS (thay thế GET /users và DELETE /users/:id).
    - Triển khai: Viết migration cấp quyền RLS cho Admin trên `public.users`.

[ ] BƯỚC 4: Tự Động Kích Hoạt Web Push Khi Có Notification Mới (Database Webhook Trigger)
    - Mục đích: Khi có bản ghi mới trong bảng `notifications`, Postgres Trigger tự động gọi Edge Function `send-webpush` thông qua `pg_net` (hoặc Supabase Database Webhook).
    - Triển khai: Tạo SQL Trigger `on_notification_created_send_push`.
```

---

## 3. Trình Tự Thực Hiện Đề Xuất

1. **Bước 1**: Tạo migration bổ sung `get_unread_summary_by_channel` và `cleanup_expired_records`.
2. **Bước 2**: Cấu hình `pg_cron` và trigger tự động gửi Web Push.
3. **Bước 3**: Cập nhật Frontend gọi RPC `get_unread_summary_by_channel` để tối ưu hóa hiển thị badge trên từng kênh.
4. **Bước 4**: Kiểm thử toàn diện và commit/push lên GitHub.
