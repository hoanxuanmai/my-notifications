# Quick Start Guide

Hướng dẫn nhanh để chạy dự án My Notifications.

## Bước 1: Chuẩn bị môi trường

1. Cài đặt Node.js >= 18.x
2. Cài đặt PostgreSQL >= 14.x
3. Cài đặt pnpm:
   ```bash
   npm install -g pnpm
   ```

## Bước 2: Setup Database

1. Tạo database PostgreSQL:
   ```sql
   CREATE DATABASE my_notifications;
   ```

2. Lưu connection string:
   ```
   postgresql://user:password@localhost:5432/my_notifications
   ```

## Bước 3: Setup Backend

```bash
cd backend

# Cài đặt dependencies
pnpm install

# Tạo file .env từ .env.example
cp .env.example .env

# Cập nhật DATABASE_URL trong .env:
# DATABASE_URL="postgresql://user:password@localhost:5432/my_notifications?schema=public"

# Generate Prisma Client
pnpm exec prisma generate

# Chạy migration để tạo tables
pnpm exec prisma migrate dev --name init

# Chạy migration SQL để tạo triggers và indexes
# (Mở file prisma/migrations/0001_setup_triggers_and_indexes.sql và chạy trong psql hoặc pgAdmin)
psql $DATABASE_URL -f prisma/migrations/0001_setup_triggers_and_indexes.sql

# Chạy backend (development mode)
pnpm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3000`

## Bước 4: Setup Frontend

```bash
cd frontend

# Cài đặt dependencies
pnpm install

# Tạo file .env.local
cp .env.local.example .env.local

# Kiểm tra .env.local có đúng:
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
# NEXT_PUBLIC_WS_URL=http://localhost:3000

# Chạy frontend
pnpm run dev
```

Frontend sẽ chạy tại: `http://localhost:3001`

## Bước 5: Sử dụng

1. Mở browser: `http://localhost:3001`
2. Tạo một channel mới
3. Copy webhook URL từ channel (ví dụ: `http://localhost:3000/api/webhooks/{webhookToken}`)
4. Gửi thử webhook:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/{webhookToken} \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Notification",
       "message": "This is a test",
       "type": "info"
     }'
   ```
5. Xem thông báo xuất hiện realtime trên frontend

## Troubleshooting

### Lỗi database connection
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong .env đúng chưa
- Kiểm tra user có quyền truy cập database

### Lỗi port đã được sử dụng
- Backend mặc định chạy port 3000, có thể đổi trong .env
- Frontend mặc định chạy port 3001, có thể đổi với `pnpm run dev -- -p 3002`

### WebSocket không kết nối
- Kiểm tra NEXT_PUBLIC_WS_URL trong .env.local
- Kiểm tra backend có đang chạy không
- Kiểm tra CORS settings trong backend/src/main.ts

