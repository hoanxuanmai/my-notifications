# Database Schema Design

## Tổng quan

Database được thiết kế với các yêu cầu:
- **Channels**: Hết hạn sau 1 năm từ khi tạo
- **Notifications**: Hết hạn sau 1 tháng từ khi tạo
- Tối ưu hiệu năng với indexes phù hợp
- Hỗ trợ cleanup tự động dữ liệu cũ

## Database: PostgreSQL

Lý do chọn PostgreSQL:
- Hỗ trợ JSON/JSONB tốt cho metadata
- Performance tốt với indexes
- Hỗ trợ native UUID
- Mature và stable

## Schema Definition

### Table: `channels`

Kênh để nhận thông báo qua webhook.

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  webhook_token VARCHAR(255) NOT NULL UNIQUE, -- Token để tạo webhook URL
  api_key VARCHAR(255), -- Optional: để xác thực webhook
  settings JSONB DEFAULT '{}', -- Cấu hình filter rules, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Tự động set = created_at + 1 năm
  is_active BOOLEAN DEFAULT TRUE -- Có thể disable thủ công
);

-- Indexes
CREATE INDEX idx_channels_webhook_token ON channels(webhook_token);
CREATE INDEX idx_channels_expires_at ON channels(expires_at);
CREATE INDEX idx_channels_is_active ON channels(is_active);
CREATE INDEX idx_channels_created_at ON channels(created_at DESC);
```

**Ghi chú:**
- `expires_at` được set tự động = `created_at + INTERVAL '1 year'`
- `webhook_token` là unique identifier để tạo webhook URL: `/api/webhooks/{webhook_token}`
- Index trên `expires_at` để cleanup nhanh

### Table: `notifications`

Thông báo nhận được từ webhook.

```sql
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'debug');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  priority notification_priority NOT NULL DEFAULT 'medium',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}', -- Thông tin bổ sung từ webhook
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Tự động set = created_at + 1 tháng
  read_at TIMESTAMP WITH TIME ZONE -- Thời điểm đánh dấu đã đọc
);

-- Indexes (tối ưu cho các query thường dùng)
CREATE INDEX idx_notifications_channel_id ON notifications(channel_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE; -- Partial index cho unread
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_channel_created ON notifications(channel_id, created_at DESC); -- Composite index cho filter theo channel
CREATE INDEX idx_notifications_channel_unread ON notifications(channel_id, read, created_at DESC) WHERE read = FALSE; -- Composite index cho unread notifications của channel
```

**Ghi chú:**
- `expires_at` được set tự động = `created_at + INTERVAL '1 month'`
- Foreign key với `ON DELETE CASCADE` - khi xóa channel, tất cả notifications cũng bị xóa
- Composite indexes để tối ưu queries phức tạp
- Partial indexes cho `read = FALSE` để tối ưu queries chỉ lấy unread notifications

### Trigger: Auto-set expires_at

```sql
-- Function để tự động set expires_at cho channels
CREATE OR REPLACE FUNCTION set_channel_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_channel_expires_at
  BEFORE INSERT ON channels
  FOR EACH ROW
  EXECUTE FUNCTION set_channel_expires_at();

-- Function để tự động set expires_at cho notifications
CREATE OR REPLACE FUNCTION set_notification_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_notification_expires_at
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_expires_at();
```

### Function: Cleanup expired data

```sql
-- Function để cleanup dữ liệu hết hạn
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(deleted_channels BIGINT, deleted_notifications BIGINT) AS $$
DECLARE
  v_deleted_channels BIGINT;
  v_deleted_notifications BIGINT;
BEGIN
  -- Xóa notifications hết hạn
  DELETE FROM notifications
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;
  
  -- Xóa channels hết hạn (notifications đã được xóa bởi CASCADE)
  DELETE FROM channels
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_channels = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_channels, v_deleted_notifications;
END;
$$ LANGUAGE plpgsql;

### Table: `channel_members`

Bảng quan hệ nhiều-nhiều giữa users và channels, dùng để gán thêm người dùng vào kênh (ngoài owner):

```sql
CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_channel_member UNIQUE (user_id, channel_id)
);

CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
```
```

## Prisma Schema

Schema cho Prisma ORM (được NestJS sử dụng):

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum NotificationType {
  info
  success
  warning
  error
  debug
}

enum NotificationPriority {
  low
  medium
  high
  urgent
}

model Channel {
  id           String    @id @default(uuid())
  name         String    @db.VarChar(255)
  description  String?   @db.Text
  webhookToken String    @unique @map("webhook_token") @db.VarChar(255)
  apiKey       String?   @map("api_key") @db.VarChar(255)
  settings     Json      @default("{}")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  expiresAt    DateTime  @map("expires_at") @db.Timestamptz(6)
  
  notifications Notification[]

  @@index([webhookToken], name: "idx_channels_webhook_token")
  @@index([expiresAt], name: "idx_channels_expires_at")
  @@index([isActive], name: "idx_channels_is_active")
  @@index([createdAt(sort: Desc)], name: "idx_channels_created_at")
  @@map("channels")
}

model Notification {
  id         String              @id @default(uuid())
  channelId  String              @map("channel_id")
  title      String              @db.VarChar(500)
  message    String              @db.Text
  type       NotificationType    @default(info)
  priority   NotificationPriority @default(medium)
  read       Boolean             @default(false)
  metadata   Json                @default("{}")
  readAt     DateTime?           @map("read_at") @db.Timestamptz(6)
  createdAt  DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)
  expiresAt  DateTime            @map("expires_at") @db.Timestamptz(6)
  
  channel    Channel             @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId], name: "idx_notifications_channel_id")
  @@index([createdAt(sort: Desc)], name: "idx_notifications_created_at")
  @@index([expiresAt], name: "idx_notifications_expires_at")
  @@index([read], name: "idx_notifications_read", where: "read = false")
  @@index([type], name: "idx_notifications_type")
  @@index([priority], name: "idx_notifications_priority")
  @@index([channelId, createdAt(sort: Desc)], name: "idx_notifications_channel_created")
  @@index([channelId, read, createdAt(sort: Desc)], name: "idx_notifications_channel_unread", where: "read = false")
  @@map("notifications")
}
```

**Lưu ý:** Prisma không hỗ trợ trực tiếp partial indexes trong schema, cần tạo bằng raw SQL migration.

## Common Queries (Optimized)

### 1. Lấy notifications của một channel (paginated)

```sql
SELECT * FROM notifications
WHERE channel_id = $1
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
-- Sử dụng index: idx_notifications_channel_created
```

### 2. Lấy unread notifications

```sql
SELECT * FROM notifications
WHERE read = FALSE
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT $1;
-- Sử dụng index: idx_notifications_read (partial index)
```

### 3. Đếm unread notifications của channel

```sql
SELECT COUNT(*) FROM notifications
WHERE channel_id = $1
  AND read = FALSE
  AND expires_at > NOW();
-- Sử dụng index: idx_notifications_channel_unread (composite partial index)
```

### 4. Lấy channels active chưa hết hạn

```sql
SELECT * FROM channels
WHERE is_active = TRUE
  AND expires_at > NOW()
ORDER BY created_at DESC;
-- Sử dụng index: idx_channels_is_active, idx_channels_expires_at
```

### 5. Cleanup expired data (cron job)

```sql
SELECT * FROM cleanup_expired_data();
-- Chạy mỗi ngày vào 2:00 AM
```

## Cleanup Strategy

### Cron Job Setup (NestJS Scheduler)

Chạy cleanup hàng ngày vào 2:00 AM:

```typescript
@Cron('0 2 * * *') // Mỗi ngày lúc 2:00 AM
async handleCleanup() {
  await this.prisma.$executeRaw`
    SELECT cleanup_expired_data()
  `;
}
```

Hoặc cleanup từng phần để tránh lock table:

```typescript
@Cron('0 2 * * *')
async handleCleanup() {
  // Xóa notifications cũ trước (nhỏ hơn)
  await this.prisma.notification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  // Sau đó xóa channels cũ
  await this.prisma.channel.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}
```

## Performance Tips

1. **Sử dụng indexes đã định nghĩa** - Tất cả queries thường dùng đều có index phù hợp
2. **Pagination** - Luôn sử dụng LIMIT/OFFSET hoặc cursor-based pagination
3. **Partial indexes** - Chỉ index unread notifications để tiết kiệm space
4. **Composite indexes** - Cho queries filter nhiều điều kiện
5. **Cleanup thường xuyên** - Chạy cleanup hàng ngày để giữ DB size nhỏ
6. **Connection pooling** - Sử dụng Prisma connection pooling
7. **Read replicas** - Cho read-heavy workloads (future)

## Migration Strategy

1. Tạo database và schema bằng Prisma migration
2. Tạo indexes bằng raw SQL (cho partial indexes)
3. Tạo triggers và functions bằng raw SQL
4. Setup cron job trong NestJS để cleanup

