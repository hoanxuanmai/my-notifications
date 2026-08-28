# Supabase CLI Project Configuration & Deployment Guide

Dự án này chứa toàn bộ mã nguồn cấu hình, migrations database, stored procedures (RPC) và Supabase Edge Functions để triển khai hệ thống thông báo (`my-notifications`) lên **Supabase Cloud** hoặc **Local Supabase** thông qua **Supabase CLI**.

---

## 1. Cấu trúc thư mục Supabase

```
supabase/
├── config.toml                            # Cấu hình dự án CLI (Ports, API, Auth, Realtime, Functions)
├── migrations/
│   └── 20240101000000_create_notifications_schema.sql  # Schema bảng, RLS, Indexes, Stored Procedures, Realtime
├── seed.sql                               # Dữ liệu mẫu (Templates, Notifications, Delivery logs)
└── functions/                             # Deno Edge Functions thay thế NestJS Controllers
    ├── send-notification/index.ts         # Thay thế SendNotificationController
    ├── kafka-bridge/index.ts              # Thay thế Kafka Consumer / Webhook
    ├── cancel-notification/index.ts       # Thay thế CancelNotificationUseCase
    └── read-notification/index.ts         # Thay thế ReadNotificationUseCase
```

---

## 2. Hướng dẫn CLI từng bước (Step-by-Step)

### Bước 1: Cài đặt Supabase CLI
Nếu bạn chưa cài đặt Supabase CLI trên máy tính:
```bash
# Cách 1: Sử dụng npx (Không cần cài global)
npx supabase --version

# Cách 2: Cài đặt qua npm
npm install -g supabase

# Cách 3: MacOS Homebrew
brew install supabase/tap/supabase

# Cách 4: Windows Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Bước 2: Đăng nhập vào tài khoản Supabase
```bash
npx supabase login
```
Lệnh này sẽ mở trình duyệt để bạn tạo Personal Access Token và xác thực CLI.

### Bước 3: Liên kết với Project Supabase của bạn
Lấy **Reference ID** dự án của bạn (nằm trong URL Supabase Dashboard: `https://supabase.com/dashboard/project/<PROJECT_REF>`):
```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
```

### Bước 4: Đẩy Database Schema & Migrations lên Supabase Cloud (`db push`)
```bash
npx supabase db push
```
Lệnh này sẽ tự động:
1. Tạo bảng `public.notifications`, `public.delivery_logs`, `public.notification_preferences`, `public.notification_templates`.
2. Thiết lập chính sách bảo mật **Row Level Security (RLS)**.
3. Tạo các Stored Procedures (RPC): `read_notification`, `unread_notification`, `cancel_notification`, `count_recipient_notifications`.
4. Bật **Supabase Realtime** cho các bảng.

### Bước 5: (Tùy chọn) Chạy Seed Data mẫu
```bash
npx supabase db reset
# Hoặc thực thi trực tiếp seed.sql qua psql hoặc SQL Editor trên Dashboard
```

### Bước 6: Triển khai các Edge Functions lên Supabase Cloud
```bash
# Triển khai toàn bộ Edge Functions:
npx supabase functions deploy send-notification --no-verify-jwt
npx supabase functions deploy kafka-bridge --no-verify-jwt
npx supabase functions deploy cancel-notification --no-verify-jwt
npx supabase functions deploy read-notification --no-verify-jwt
```

### Bước 7: Tự động sinh TypeScript Types từ Database
```bash
npx supabase gen types typescript --linked > src/types/supabase.ts
```

---

## 3. Chạy Local Supabase (Docker)
Nếu bạn muốn chạy toàn bộ Supabase cục bộ trên máy tính:
```bash
# Khởi động Supabase local (yêu cầu Docker đang chạy)
npx supabase start

# Xem thông tin kết nối và Studio URL (http://localhost:54324)
npx supabase status

# Dừng Supabase local
npx supabase stop
```
