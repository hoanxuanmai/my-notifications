# Supabase Architecture & Channels Implementation Guide

Dự án này chứa toàn bộ mã nguồn cấu hình, migrations database, stored procedures (RPC), Row Level Security (RLS) và Supabase Edge Functions để thay thế hoàn toàn backend **NestJS + Prisma + PostgreSQL + WebSocket Gateway** sang **Supabase Cloud**.

---

## 1. Cấu trúc bảng & Quan hệ Channels & Notifications

### Bảng `public.channels`
- `id` (UUID, Primary Key)
- `user_id` (UUID -> `auth.users(id)`: Chủ sở hữu channel)
- `name` (VARCHAR: Tên channel)
- `description` (TEXT: Mô tả)
- `webhook_token` (VARCHAR UNIQUE: Token nhận webhook từ các hệ thống ngoài)
- `api_key` (VARCHAR: API Key)
- `settings` (JSONB: Cấu hình template, webhook format, slack/discord)
- `is_active` (BOOLEAN: Trạng thái kích hoạt)
- `created_at`, `updated_at`, `expires_at` (TIMESTAMPTZ)

### Bảng `public.channel_members`
- `id` (UUID, Primary Key)
- `channel_id` (UUID -> `public.channels(id)`)
- `user_id` (UUID -> `auth.users(id)`)
- `role` (VARCHAR: `'owner'`, `'admin'`, `'member'`)
- `UNIQUE(user_id, channel_id)`: Đảm bảo 1 user không bị trùng lặp trong 1 channel

### Bảng `public.notifications`
- `id` (UUID, Primary Key)
- `channel_id` (UUID -> `public.channels(id)` ON DELETE CASCADE)
- `user_id` (UUID -> `auth.users(id)`)
- `recipient_id` (VARCHAR: User ID hoặc Channel recipient)
- `title` (VARCHAR: Tiêu đề thông báo)
- `message` / `content` (TEXT: Nội dung thông báo)
- `type` (`info`, `success`, `warning`, `error`, `debug`)
- `priority` (`low`, `medium`, `high`, `urgent`)
- `read` / `is_read` (BOOLEAN: Trạng thái đã đọc)
- `metadata` / `payload` (JSONB: Dữ liệu tùy chỉnh kèm theo)
- `read_at`, `expires_at`, `created_at`, `updated_at`

---

## 2. Bảo mật Row Level Security (RLS) cho Channels

Hệ thống RLS đảm bảo:
1. **Xem Channel (`SELECT`)**: Người dùng là **Chủ sở hữu channel** (`user_id = auth.uid()`) HOẶC là **Thành viên trong channel** (`id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid())`).
2. **Quản lý Thành viên (`INSERT`/`DELETE` channel_members)**: Chỉ chủ channel mới có quyền thêm/xóa thành viên. Thành viên có quyền tự rời khỏi channel (`user_id = auth.uid()`).
3. **Xem Thông báo (`SELECT notifications`)**: Người dùng được xem thông báo nếu là chủ sở hữu, người nhận đích (`recipient_id`), hoặc thuộc channel (`channel_id`) mà user đó là chủ sở hữu hoặc thành viên.
4. **Đánh dấu đã đọc (`UPDATE notifications`)**: Thành viên hoặc chủ channel có thể cập nhật trạng thái đọc của thông báo trong channel.

---

## 3. Stored Procedures (RPC Functions)

Hệ thống cung cấp đầy đủ các RPC tương ứng 100% logic NestJS:

| Tên RPC | Tham số | Chức năng |
| :--- | :--- | :--- |
| `create_channel` | `p_name, p_description, p_settings` | Tạo channel mới cho user hiện tại kèm `webhook_token` ngẫu nhiên |
| `add_channel_member_by_email` | `p_channel_id, p_email` | Thêm thành viên vào channel theo email (chỉ chủ channel) |
| `remove_channel_member` | `p_channel_id, p_member_user_id` | Xóa thành viên khỏi channel |
| `get_user_channels` | `p_user_id` | Lấy danh sách channel của user kèm số tin chưa đọc (`_count.notifications`) và tin nhắn mới nhất |
| `send_channel_notification` | `p_channel_id, p_title, p_message, p_type, p_priority, p_metadata, p_ttl_days` | Đẩy thông báo vào channel, tự động ghi telemetry log |
| `send_notification_by_webhook`| `p_webhook_token, p_title, p_message, p_type, p_priority, p_metadata` | Nhận webhook bên ngoài qua token và đẩy vào channel |
| `mark_channel_notifications_read` | `p_channel_id` | Đánh dấu tất cả thông báo trong channel là đã đọc |
| `get_channel_unread_count` | `p_channel_id` | Đếm số thông báo chưa đọc trong channel |
| `get_channels_unread_summary` | `p_user_id` | Thống kê số lượng chưa đọc của tất cả các channel |

---

## 4. Edge Functions

1. **`webhooks`**:
   - Hỗ trợ nhận Webhook từ bên thứ ba qua đường dẫn `/functions/v1/webhooks/:token`, `channelId`, `webhookToken`, hoặc `recipientId`.
   - Lưu vào bảng `public.notifications` và tạo bản ghi telemetry trong `public.delivery_logs`.
2. **`channel-manager`**:
   - Endpoint HTTP quản lý tạo channel, thêm thành viên, lấy danh sách channel, thống kê chưa đọc.
3. **`kafka-bridge`**:
   - Ingest message từ Kafka / Event bus / Webhooks và phân phối vào Channel Supabase Realtime.
4. **`read-notification` & `cancel-notification`**:
   - Đánh dấu đã đọc và hủy thông báo.

---

## 5. Triển khai tự động bằng GitHub Actions

Mọi thay đổi SQL và Edge Functions khi push vào nhánh `supabase` hoặc `main` sẽ được GitHub Actions tự động:
1. Chạy `supabase db push` để tạo/cập nhật bảng, triggers, procedures, RLS.
2. Deploy toàn bộ các Edge Functions trong `supabase/functions/`.
