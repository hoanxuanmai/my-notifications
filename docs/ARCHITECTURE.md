# Kiến trúc hệ thống My Notifications

## Tổng quan

My Notifications được thiết kế theo kiến trúc Client-Server với realtime communication.

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │◄───────►│   Backend    │◄───────►│  Database   │
│  (Browser)  │ WebSocket│  (API Server)│         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                              ▲
                              │
                              │ HTTP POST
                              │
                        ┌─────┴─────┐
                        │  External │
                        │  Systems  │
                        │ (Webhooks)│
                        └───────────┘
```

## Data Flow

### 1. Nhận thông báo từ webhook

```
External System → HTTP POST → Backend API → Validate → Save to DB → Broadcast via WebSocket → Client
```

### 2. Hiển thị realtime

```
Backend → WebSocket Event → Frontend → Update UI
```

## Database Schema

Xem file [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) để biết chi tiết đầy đủ về schema.

### Channels
- id (UUID)
- name (string)
- description (string, optional)
- webhook_token (string, unique) - Token để tạo webhook URL
- api_key (string, optional) - Để xác thực webhook
- settings (JSONB, optional) - Cấu hình filter rules, etc.
- is_active (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
- **expires_at (timestamp)** - Tự động hết hạn sau 1 năm

### Notifications
- id (UUID)
- channel_id (UUID, foreign key, CASCADE DELETE)
- title (string)
- message (text)
- type (enum: info, success, warning, error, debug)
- priority (enum: low, medium, high, urgent)
- read (boolean, default: false)
- read_at (timestamp, optional)
- metadata (JSONB, optional) - Thông tin bổ sung
- created_at (timestamp)
- updated_at (timestamp)
- **expires_at (timestamp)** - Tự động hết hạn sau 1 tháng

### Indexes (Tối ưu cho performance)
- `channels.webhook_token` (unique)
- `channels.expires_at`
- `channels.is_active`
- `notifications.channel_id`
- `notifications.created_at` (DESC)
- `notifications.expires_at`
- `notifications.read` (partial index cho unread)
- `notifications.type`
- `notifications.priority`
- `notifications(channel_id, created_at DESC)` - Composite index
- `notifications(channel_id, read, created_at DESC WHERE read = FALSE)` - Composite partial index

## API Design

### RESTful API
- Tất cả endpoints bắt đầu với `/api`
- Sử dụng HTTP status codes chuẩn
- Response format: JSON

### WebSocket Events

**Client → Server:**
- `subscribe:channel` - Subscribe vào một channel
- `unsubscribe:channel` - Unsubscribe khỏi channel
- `mark_read` - Đánh dấu thông báo đã đọc

**Server → Client:**
- `notification:new` - Thông báo mới
- `notification:updated` - Thông báo được cập nhật
- `notification:deleted` - Thông báo bị xóa

## Security

### Webhook Authentication (optional)
- API Key trong header: `X-API-Key`
- HMAC Signature: `X-Signature` với timestamp

### CORS
- Chỉ cho phép từ các domain được cấu hình

### Rate Limiting
- Giới hạn số lượng webhook requests từ một IP
- Giới hạn số lượng thông báo mỗi channel

## Performance Considerations

### Caching
- Cache danh sách channels (TTL: 5 phút)
- Cache statistics (TTL: 1 phút)

### Pagination
- Mặc định: 50 thông báo mỗi page
- Cursor-based pagination cho large datasets

### WebSocket Connection
- Heartbeat mỗi 30 giây
- Auto-reconnect khi mất kết nối
- Connection pooling cho nhiều clients

## Scalability

### Horizontal Scaling
- Stateless backend → có thể scale nhiều instances
- Database connection pooling
- Message queue (Redis/RabbitMQ) cho webhook processing (future)

### Database
- Indexes tối ưu cho tất cả queries thường dùng
- Partial indexes cho unread notifications
- Composite indexes cho queries phức tạp
- Tự động cleanup dữ liệu hết hạn (channels sau 1 năm, notifications sau 1 tháng)
- Cron job cleanup chạy hàng ngày

## Monitoring & Logging

### Metrics
- Số lượng webhook requests
- Số lượng thông báo tạo mới
- Số lượng active WebSocket connections
- Response time của API endpoints

### Logging
- Log tất cả webhook requests
- Log errors và exceptions
- Log WebSocket connections/disconnections

