# My Notifications

## 📋 Tổng quan dự án

**My Notifications** là một hệ thống nhận và hiển thị thông báo realtime dành cho developers. Hệ thống cho phép tạo các kênh (channels) để nhận tin nhắn trực tiếp từ nhiều nguồn khác nhau thông qua webhook, phục vụ mục đích theo dõi log và monitoring realtime.

## 🎯 Mục đích

- **Theo dõi log realtime**: Developers có thể theo dõi log từ các hệ thống, ứng dụng một cách realtime
- **Nhận thông báo từ nhiều nguồn**: Tích hợp với nhiều hệ thống khác nhau thông qua webhook
- **Không có tương tác chat**: Chỉ nhận và hiển thị tin nhắn, không có tính năng chat hay phản hồi
- **Tập trung hóa thông báo**: Tất cả thông báo từ các hệ thống khác nhau được tập trung tại một nơi

## 🏗️ Kiến trúc hệ thống

### Các thành phần chính

1. **Channels (Kênh)**
   - Mỗi kênh là một điểm nhận tin nhắn độc lập
   - Mỗi kênh có URL webhook riêng để nhận thông báo
   - Có thể đặt tên và mô tả cho từng kênh
   - Hỗ trợ cấu hình mức độ ưu tiên và lọc thông báo

2. **Webhook Receivers**
   - Nhận tin nhắn từ các hệ thống bên ngoài thông qua HTTP POST
   - Hỗ trợ nhiều format: JSON, plain text, form-data
   - Xác thực webhook (optional): API key, signature verification

3. **Notification Display**
   - Hiển thị thông báo realtime (WebSocket hoặc Server-Sent Events)
   - Giao diện web để xem và quản lý thông báo
   - Lọc và tìm kiếm thông báo
   - Đánh dấu đã đọc/chưa đọc

4. **Storage**
   - Lưu trữ lịch sử thông báo trong PostgreSQL
   - Hỗ trợ pagination cho danh sách thông báo cũ
   - **Channels tự động hết hạn sau 1 năm**
   - **Notifications tự động hết hạn sau 1 tháng**
   - Cleanup tự động chạy hàng ngày

## 📦 Tính năng chính

### Tính năng cốt lõi

- ✅ Tạo và quản lý các kênh (channels)
- ✅ Nhận thông báo qua webhook (HTTP POST)
- ✅ Hiển thị thông báo realtime
- ✅ Phân loại thông báo theo kênh
- ✅ Đánh dấu đã đọc/chưa đọc
- ✅ Tìm kiếm và lọc thông báo
- ✅ Lưu trữ lịch sử thông báo

### Tính năng mở rộng (dự định)

- 🔄 Hỗ trợ nhiều format webhook (JSON, XML, form-data)
- 🔄 Xác thực webhook (API key, HMAC signature)
- 🔄 Filter rules cho mỗi kênh (chỉ nhận thông báo theo điều kiện)
- 🔄 Export thông báo (CSV, JSON)
- 🔄 Thống kê và analytics (số lượng thông báo theo thời gian)
- 🔄 Dark mode / Light mode
- 🔄 Responsive design (mobile-friendly)
- 🔄 Desktop notifications (browser notifications)
- 🔄 Hỗ trợ markdown trong nội dung thông báo
- 🔄 Hỗ trợ attachments/files trong webhook

## 🛠️ Công nghệ

### Backend
- **Runtime**: Node.js
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Realtime**: WebSocket (Socket.io hoặc @nestjs/websockets)
- **Scheduler**: @nestjs/schedule (cho cleanup job)

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **State Management**: Zustand hoặc React Context
- **UI Library**: Tailwind CSS + shadcn/ui hoặc Radix UI
- **Realtime**: Socket.io-client hoặc WebSocket API
- **HTTP Client**: Axios hoặc fetch API

### DevOps
- **Package Manager**: pnpm
- **Build Tool**: Next.js built-in (Turbopack)
- **Container**: Docker (optional)
- **Database Migration**: Prisma Migrate

## 📁 Cấu trúc dự án

```
my-notifications/
├── docs/                    # Tài liệu dự án
│   ├── PROJECT_DESCRIPTION.md
│   ├── DATABASE_SCHEMA.md   # Database schema chi tiết
│   ├── API.md               # API documentation
│   └── ARCHITECTURE.md      # Kiến trúc chi tiết
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── channels/        # Channels module
│   │   │   ├── channels.controller.ts
│   │   │   ├── channels.service.ts
│   │   │   └── channels.module.ts
│   │   ├── notifications/   # Notifications module
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── notifications.module.ts
│   │   ├── webhooks/        # Webhooks module
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts
│   │   │   └── webhooks.module.ts
│   │   ├── websocket/       # WebSocket gateway
│   │   │   └── notifications.gateway.ts
│   │   ├── cleanup/         # Cleanup scheduler
│   │   │   └── cleanup.service.ts
│   │   ├── prisma/          # Prisma client
│   │   │   └── prisma.service.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma    # Prisma schema
│   ├── package.json
│   └── .env
├── frontend/                # Next.js Frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── channels/
│   │   ├── components/      # React components
│   │   │   ├── notifications/
│   │   │   └── channels/
│   │   ├── lib/             # Utilities & services
│   │   │   ├── api.ts       # API client
│   │   │   └── websocket.ts # WebSocket client
│   │   ├── stores/          # State management (Zustand)
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── .env.local
├── shared/                  # Shared types (optional)
│   └── types/
├── .env.example             # Environment variables template
├── docker-compose.yml       # Docker setup (optional)
└── README.md                # Hướng dẫn setup và sử dụng
```

## 🔌 API Endpoints (dự kiến)

### Channels Management
- `GET /api/channels` - Lấy danh sách kênh
- `POST /api/channels` - Tạo kênh mới
- `GET /api/channels/:id` - Lấy thông tin kênh
- `PUT /api/channels/:id` - Cập nhật kênh
- `DELETE /api/channels/:id` - Xóa kênh

### Webhooks
- `POST /api/webhooks/:channelId` - Nhận webhook từ hệ thống bên ngoài
- `GET /api/webhooks/:channelId/info` - Thông tin webhook URL và cấu hình

### Notifications
- `GET /api/notifications` - Lấy danh sách thông báo (có pagination và filter)
- `GET /api/notifications/:id` - Lấy chi tiết thông báo
- `PUT /api/notifications/:id/read` - Đánh dấu đã đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả đã đọc
- `DELETE /api/notifications/:id` - Xóa thông báo

### Statistics
- `GET /api/statistics` - Thống kê thông báo

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
    "error_code": "PG_TIMEOUT",
    "request_id": "req-123456"
  }
}
```

### Simple Text Format
```
POST /api/webhooks/:channelId
Content-Type: text/plain

This is a simple text notification
```

## 🚀 Roadmap

### Phase 1: MVP (Minimum Viable Product)
- [ ] Backend API cơ bản
- [ ] Webhook receiver
- [ ] Tạo và quản lý channels
- [ ] Lưu trữ thông báo vào database
- [ ] Frontend đơn giản hiển thị danh sách thông báo
- [ ] Realtime update

### Phase 2: Core Features
- [ ] Filter và search thông báo
- [ ] Đánh dấu đã đọc
- [ ] Phân loại theo channel
- [ ] UI/UX cải thiện

### Phase 3: Advanced Features
- [ ] Webhook authentication
- [ ] Filter rules
- [ ] Statistics và analytics
- [ ] Export functionality
- [ ] Desktop notifications

### Phase 4: Production Ready
- [ ] Error handling và logging
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation hoàn chỉnh
- [ ] Testing (unit, integration, e2e)

## 📚 Use Cases

1. **Development Log Monitoring**
   - Developer setup webhook từ ứng dụng đang phát triển
   - Nhận log errors, warnings realtime khi chạy ứng dụng

2. **CI/CD Notifications**
   - Tích hợp với GitHub Actions, GitLab CI
   - Nhận thông báo về build status, deployment

3. **System Monitoring**
   - Nhận thông báo từ monitoring tools (Prometheus, Grafana)
   - Theo dõi health check của các services

4. **Multiple Projects**
   - Mỗi project có một channel riêng
   - Theo dõi nhiều dự án cùng lúc

## 🔄 Cập nhật

File này sẽ được cập nhật thường xuyên khi dự án phát triển. Mỗi khi có thay đổi về:
- Tính năng mới
- Kiến trúc
- API design
- Tech stack

Hãy cập nhật vào file này để AI và team có thể theo dõi và phát triển dự án một cách nhất quán.

## 📝 Ghi chú

- Dự án tập trung vào việc **nhận** thông báo, không có tính năng chat
- Thiết kế đơn giản, dễ sử dụng
- Ưu tiên performance và realtime updates
- Có thể tự host hoặc deploy lên cloud

