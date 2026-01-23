# My Notifications

> Hệ thống nhận và hiển thị thông báo realtime cho developers - Nơi tập trung tất cả thông báo từ nhiều hệ thống khác nhau

## 📋 Mô tả

**My Notifications** là một hệ thống đơn giản để nhận và theo dõi thông báo realtime từ nhiều nguồn khác nhau thông qua webhook. Dự án được thiết kế đặc biệt cho developers để theo dõi log và monitoring realtime.

### Đặc điểm chính

- ✅ Nhận thông báo qua webhook từ nhiều hệ thống
- ✅ Hiển thị realtime (không cần refresh)
- ✅ Tổ chức thông báo theo kênh (channels)
- ✅ Giao diện đơn giản, dễ sử dụng
- ✅ Không có tính năng chat - chỉ nhận và hiển thị
- ✅ Auto-expiry: Channels (1 năm), Notifications (1 tháng)

## 🚀 Quick Start

### Yêu cầu

- Node.js >= 18.x
- PostgreSQL >= 14.x
- pnpm (Package Manager)

### Cài đặt pnpm

```bash
npm install -g pnpm
# hoặc
corepack enable
corepack prepare pnpm@latest --activate
```

### Setup Backend

```bash
cd backend

# Cài đặt dependencies
pnpm install

# Copy .env.example và cấu hình
cp .env.example .env
# Chỉnh sửa DATABASE_URL trong .env

# Setup database
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init

# Chạy migration cho triggers và indexes
# (Chạy file SQL trong prisma/migrations/0001_setup_triggers_and_indexes.sql)

# Chạy backend
pnpm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3000`

### Setup Frontend

```bash
cd frontend

# Cài đặt dependencies
pnpm install

# Copy .env.local.example và cấu hình
cp .env.local.example .env.local

# Chạy frontend
pnpm run dev
```

Frontend sẽ chạy tại: `http://localhost:3001`

## 📖 Tài liệu

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** ⭐ **File tổng hợp toàn bộ context dự án - Đọc file này trước!**
- **[PROJECT_DESCRIPTION.md](./docs/PROJECT_DESCRIPTION.md)** - Mô tả tổng quan dự án, tính năng, roadmap
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Kiến trúc hệ thống, data flow, security
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Thiết kế database chi tiết với indexes và optimization
- **[SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)** - Hướng dẫn setup và development chi tiết
- **[REPOSITORY_PATTERN.md](./docs/REPOSITORY_PATTERN.md)** - Giải thích Repository Pattern
- **[AUTH_MODULE.md](./docs/AUTH_MODULE.md)** - Hướng dẫn Authentication & Authorization

## 🛠️ Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL, WebSocket (Socket.io)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Package Manager**: pnpm
- **Database**: PostgreSQL với auto-expiry (channels: 1 năm, notifications: 1 tháng)

## 📁 Cấu trúc dự án

```
my-notifications/
├── backend/              # NestJS Backend
│   ├── src/
│   │   ├── channels/     # Channels module
│   │   ├── notifications/# Notifications module
│   │   ├── webhooks/     # Webhooks module
│   │   ├── websocket/    # WebSocket gateway
│   │   ├── cleanup/      # Cleanup service (cron)
│   │   └── prisma/       # Prisma service
│   └── prisma/           # Prisma schema & migrations
├── frontend/             # Next.js Frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React components
│   │   ├── lib/          # API & WebSocket clients
│   │   └── stores/       # Zustand state management
└── docs/                 # Documentation
```

## 🗄️ Database Features

- **Auto-expiry**: Channels hết hạn sau 1 năm, Notifications hết hạn sau 1 tháng
- **Auto-cleanup**: Cron job chạy hàng ngày lúc 2:00 AM để xóa dữ liệu hết hạn
- **Optimized indexes**: Partial indexes, composite indexes cho queries nhanh
- **Cascade delete**: Xóa channel sẽ tự động xóa tất cả notifications liên quan

## 🔌 API Endpoints

### Channels
- `GET /api/channels` - Lấy danh sách kênh
- `POST /api/channels` - Tạo kênh mới
- `GET /api/channels/:id` - Lấy thông tin kênh
- `PATCH /api/channels/:id` - Cập nhật kênh
- `DELETE /api/channels/:id` - Xóa kênh

### Notifications
- `GET /api/notifications` - Lấy danh sách thông báo
- `GET /api/notifications/:id` - Lấy chi tiết thông báo
- `PUT /api/notifications/:id/read` - Đánh dấu đã đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả đã đọc
- `GET /api/notifications/unread/count` - Đếm số thông báo chưa đọc

### Webhooks
- `POST /api/webhooks/:webhookToken` - Nhận webhook từ hệ thống bên ngoài

## 📝 Webhook Format

### JSON Format (khuyến nghị)
```json
{
  "title": "Error in Payment Service",
  "message": "Payment gateway timeout after 30s",
  "type": "error",
  "priority": "high",
  "metadata": {
    "service": "payment-service",
    "error_code": "PG_TIMEOUT"
  }
}
```

### Simple Text
```
POST /api/webhooks/{webhookToken}
Content-Type: text/plain

This is a simple text notification
```

## 🚀 Development

### Backend
```bash
cd backend
pnpm run start:dev
```

### Frontend
```bash
cd frontend
pnpm run dev
```

### Database Migrations
```bash
cd backend
pnpm exec prisma migrate dev --name migration_name
pnpm exec prisma studio  # Xem database
```

## 📝 License

*(Sẽ được cập nhật)*

## 🤝 Contributing

*(Sẽ được cập nhật)*
