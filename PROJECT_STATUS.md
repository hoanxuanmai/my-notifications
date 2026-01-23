# My Notifications - Project Status & Context

> **File tổng hợp toàn bộ thông tin dự án để AI/Cursor có thể tiếp tục phát triển**

## 📋 Tổng quan dự án

**My Notifications** là hệ thống nhận và hiển thị thông báo realtime cho developers. Hệ thống cho phép tạo các kênh (channels) để nhận tin nhắn trực tiếp từ nhiều nguồn khác nhau thông qua webhook, phục vụ mục đích theo dõi log và monitoring realtime.

### Đặc điểm chính

- ✅ Nhận thông báo qua webhook từ nhiều hệ thống
- ✅ Hiển thị realtime (WebSocket)
- ✅ Tổ chức thông báo theo kênh (channels)
- ✅ Mỗi channel thuộc về một user (ownership)
- ✅ Authentication với JWT
- ✅ Auto-expiry: Channels (1 năm), Notifications (1 tháng)
- ✅ Không có tính năng chat - chỉ nhận và hiển thị

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (Passport)
- **Password Hashing**: bcrypt
- **Realtime**: WebSocket (Socket.io)
- **Scheduler**: @nestjs/schedule (cho cleanup job)
- **Package Manager**: pnpm

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Zustand
- **UI**: Tailwind CSS
- **HTTP Client**: Axios
- **WebSocket**: socket.io-client

## 📁 Cấu trúc dự án

```
my-notifications/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── app.module.ts             # Root module
│   │   ├── main.ts                   # Entry point
│   │   │
│   │   ├── auth/                     # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/                    # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── channels/                 # Channels module (có userId/ownership)
│   │   │   ├── channels.module.ts
│   │   │   ├── channels.service.ts
│   │   │   ├── channels.controller.ts
│   │   │   └── dto/
│   │   │       ├── create-channel.dto.ts
│   │   │       └── update-channel.dto.ts
│   │   │
│   │   ├── notifications/            # Notifications module
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.controller.ts
│   │   │   └── dto/
│   │   │       ├── create-notification.dto.ts
│   │   │       └── notification-query.dto.ts
│   │   │
│   │   ├── webhooks/                 # Webhooks module (public, không cần auth)
│   │   │   ├── webhooks.module.ts
│   │   │   ├── webhooks.service.ts
│   │   │   └── webhooks.controller.ts
│   │   │
│   │   ├── websocket/                # WebSocket gateway
│   │   │   ├── notifications.module.ts
│   │   │   └── notifications.gateway.ts
│   │   │
│   │   ├── cleanup/                  # Cleanup service (cron job)
│   │   │   ├── cleanup.module.ts
│   │   │   └── cleanup.service.ts
│   │   │
│   │   ├── common/                   # Shared code
│   │   │   ├── enums/
│   │   │   │   ├── notification.enum.ts  # NotificationType, NotificationPriority
│   │   │   │   └── user.enum.ts          # UserRole (future)
│   │   │   ├── types/
│   │   │   │   ├── database.types.ts     # Channel, Notification, etc.
│   │   │   │   └── user.types.ts         # User, UserPublic, JwtPayload
│   │   │   └── repositories/             # Repository Pattern
│   │   │       ├── base.repository.ts
│   │   │       ├── channels.repository.ts
│   │   │       ├── notifications.repository.ts
│   │   │       ├── users.repository.ts
│   │   │       └── repositories.module.ts
│   │   │
│   │   └── prisma/                    # Prisma service
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   └── prisma/
│       ├── schema.prisma              # Prisma schema (có User, Channel với userId, Notification)
│       └── migrations/                # Migration files
│
├── frontend/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── channels/
│   │   │   │   └── ChannelsList.tsx
│   │   │   └── notifications/
│   │   │       └── NotificationsList.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client (Axios)
│   │   │   └── websocket.ts           # WebSocket client
│   │   ├── stores/
│   │   │   └── notifications-store.ts # Zustand store
│   │   └── types/
│   │       └── index.ts               # TypeScript types
│
├── docs/                              # Documentation
│   ├── PROJECT_DESCRIPTION.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── SETUP_GUIDE.md
│   ├── REPOSITORY_PATTERN.md
│   ├── AUTH_MODULE.md
│
├── prisma/                            # Shared Prisma (root)
│   ├── schema.prisma
│   └── migrations/
│       └── 0001_setup_triggers_and_indexes.sql
│
└── README.md
```

## 🗄️ Database Schema

### Models

#### User
```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  username  String    @unique
  password  String    // Hashed với bcrypt
  name      String?
  avatar    String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  channels  Channel[]
}
```

#### Channel (có userId)
```prisma
model Channel {
  id           String    @id @default(uuid())
  name         String
  description  String?
  webhookToken String    @unique
  apiKey       String?
  settings     Json      @default("{}")
  isActive     Boolean   @default(true)
  userId       String    // OWNERSHIP - mỗi channel thuộc về một user
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  expiresAt    DateTime  // Auto-expiry: created_at + 1 year
  
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  notifications Notification[]
}
```

#### Notification
```prisma
model Notification {
  id         String              @id @default(uuid())
  channelId  String
  title      String
  message    String              @db.Text
  type       NotificationType    @default(info)
  priority   NotificationPriority @default(medium)
  read       Boolean             @default(false)
  metadata   Json                @default("{}")
  readAt     DateTime?
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  expiresAt  DateTime            // Auto-expiry: created_at + 1 month
  
  channel    Channel             @relation(fields: [channelId], references: [id], onDelete: Cascade)
}
```

### Enums
```prisma
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
```

### Indexes quan trọng
- `users.email` (unique)
- `users.username` (unique)
- `channels.user_id` (foreign key, indexed)
- `channels.webhook_token` (unique)
- `notifications.channel_id` (foreign key, indexed)
- `notifications.created_at DESC` (for pagination)
- Partial indexes cho unread notifications

### Auto-expiry
- **Channels**: 1 năm (tự động set bởi trigger)
- **Notifications**: 1 tháng (tự động set bởi trigger)
- **Cleanup job**: Chạy mỗi ngày lúc 2:00 AM (cron)

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Register**: `POST /api/auth/register`
   - Tạo user mới
   - Hash password với bcrypt
   - Trả về JWT token

2. **Login**: `POST /api/auth/login`
   - Validate email/username + password
   - Trả về JWT token

3. **Protected Routes**: 
   - Sử dụng `@UseGuards(JwtAuthGuard)`
   - Lấy user từ `@CurrentUser()` decorator

### Authorization

- **Channels**: Mỗi user chỉ có thể access channels của mình
  - `findAll(userId)` - filter theo userId
  - `findOne(id, userId)` - check ownership trước khi return
  - Ownership check: `if (channel.userId !== userId) throw ForbiddenException`

- **Notifications**: Filter theo channels của user (thông qua channelId)

- **Webhooks**: Public (không cần auth) - chỉ cần webhookToken

## 📡 API Endpoints

### Auth (Public)
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập

### Users (Protected)
- `GET /api/users/me` - Lấy thông tin user hiện tại
- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy thông tin user
- `PATCH /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

### Channels (Protected - chỉ channels của user)
- `POST /api/channels` - Tạo channel (tự động gán userId)
- `GET /api/channels` - Lấy channels của user hiện tại
- `GET /api/channels/:id` - Lấy channel (check ownership)
- `PATCH /api/channels/:id` - Cập nhật channel (check ownership)
- `DELETE /api/channels/:id` - Xóa channel (check ownership)

### Notifications (Protected)
- `GET /api/notifications` - Lấy danh sách (có filter, pagination)
- `GET /api/notifications/:id` - Lấy chi tiết
- `PUT /api/notifications/:id/read` - Đánh dấu đã đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả đã đọc
- `GET /api/notifications/unread/count` - Đếm unread

### Webhooks (Public - chỉ cần webhookToken)
- `POST /api/webhooks/:webhookToken` - Nhận webhook từ external systems

## 🔧 Repository Pattern

Dự án sử dụng Repository Pattern để quản lý ORM:

### Base Repository
```typescript
abstract class BaseRepository<T> {
  findById(id: string, include?: any): Promise<T | null>
  findMany(options?: {...}): Promise<T[]>
  count(where?: any): Promise<number>
  create(data: any, include?: any): Promise<T>
  update(id: string, data: any, include?: any): Promise<T>
  delete(id: string): Promise<T>
  updateMany(where: any, data: any)
  deleteMany(where: any)
}
```

### Specific Repositories
- `ChannelsRepository`: `findByWebhookToken()`, `findActiveChannelsByUserId()`
- `NotificationsRepository`: `findWithFilter()`, `countUnread()`, `markAsRead()`, `markAllAsRead()`
- `UsersRepository`: `findByEmail()`, `findByUsername()`, `findByEmailOrUsername()`

### Shared Enums & Types
- **Enums**: `NotificationType`, `NotificationPriority`, `UserRole` (future)
- **Types**: `Channel`, `Notification`, `User`, `UserPublic`, `JwtPayload`, `NotificationFilter`, `PaginatedResponse`

**Lưu ý**: Không import trực tiếp từ `@prisma/client` trong services. Dùng shared enums/types từ `common/`.

## 🔄 WebSocket Realtime

### Gateway
- `NotificationsGateway` - Socket.io gateway
- Namespace: `/notifications`
- Events:
  - Client → Server: `subscribe:channel`, `unsubscribe:channel`
  - Server → Client: `notification:new`, `notification:updated`, `notification:deleted`

### Flow
1. Webhook nhận notification → `NotificationsService.create()`
2. Emit WebSocket event: `notificationsGateway.emitNewNotification()`
3. Frontend nhận realtime update

## 🧹 Cleanup Service

- **Cron job**: Chạy mỗi ngày lúc 2:00 AM
- **Xóa**: 
  - Notifications hết hạn (expiresAt < NOW())
  - Channels hết hạn (expiresAt < NOW()) - notifications tự động xóa bởi CASCADE

## 📦 Dependencies chính

### Backend
```json
{
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "@prisma/client": "^5.7.0",
  "@nestjs/websockets": "^10.3.0",
  "@nestjs/platform-socket.io": "^10.3.0",
  "socket.io": "^4.6.0",
  "@nestjs/schedule": "^4.0.0",
  "date-fns": "^3.0.6",
  "uuid": "^9.0.1"
}
```

### Frontend
```json
{
  "next": "14.0.4",
  "react": "^18.2.0",
  "zustand": "^4.4.7",
  "axios": "^1.6.2",
  "socket.io-client": "^4.6.0",
  "date-fns": "^3.0.6"
}
```

## 🗃️ Migrations

### Migration Files

1. **`backend/prisma/migrations/20240101000000_add_user_and_auth.sql`**
   - Tạo User table
   - Thêm userId vào Channel table
   - Foreign keys và indexes

2. **`backend/prisma/migrations/20240101000001_add_user_safe_migration.sql`**
   - Safe migration cho database đã có dữ liệu
   - Tạo system user và gán channels cũ

3. **`prisma/migrations/0001_setup_triggers_and_indexes.sql`**
   - Triggers để auto-set expires_at
   - Partial indexes cho unread notifications
   - Cleanup function

### Chạy Migration

```bash
cd backend
pnpm exec prisma migrate dev --name migration_name
# hoặc
psql $DATABASE_URL -f prisma/migrations/xxxxx.sql
```

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/my_notifications?schema=public"
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

## 🚀 Development Commands

### Backend
```bash
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm run start:dev
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

## 🎯 Quyết định thiết kế quan trọng

1. **Repository Pattern**: Tách biệt database logic khỏi business logic, dễ test và maintain

2. **Shared Enums/Types**: Không import trực tiếp từ Prisma, dùng shared enums để dễ migrate

3. **Ownership Model**: Mỗi channel thuộc về một user - ownership check ở service level

4. **Auto-expiry**: Channels (1 năm), Notifications (1 tháng) - tự động cleanup

5. **Webhook Public**: Webhook endpoints không cần auth, chỉ cần webhookToken (vì external systems cần gọi)

6. **Cascade Delete**: 
   - User → Channels → Notifications (cascade)
   - Channel → Notifications (cascade)

7. **JWT Authentication**: Stateless authentication, token expires sau 7 ngày

8. **Password Security**: bcrypt với salt rounds = 10

## 📝 Ghi chú cho AI/Cursor tiếp theo

### Các thay đổi quan trọng
- ✅ User model đã được thêm vào schema
- ✅ Channel có userId (ownership)
- ✅ Auth module với JWT đã hoàn chỉnh
- ✅ Repository Pattern đã implement
- ✅ Migration files đã tạo
- ✅ Ownership check đã implement trong channels service

### Cần lưu ý khi phát triển tiếp
1. **Channels**: Luôn filter theo userId hoặc check ownership
2. **Notifications**: Filter theo channels của user (qua channelId)
3. **Enums**: Dùng shared enums, không import từ @prisma/client
4. **Repository**: Dùng repositories thay vì PrismaService trực tiếp
5. **Migration**: Nếu thay đổi schema, chạy `prisma migrate dev`

### Các tính năng có thể phát triển tiếp
- [ ] Refresh token
- [ ] Password reset
- [ ] Email verification
- [ ] User roles/permissions
- [ ] Channel sharing/collaboration
- [ ] Webhook authentication (API key)
- [ ] Rate limiting
- [ ] Audit logs

---

**Last Updated**: 2024-01-21
**Status**: ✅ Core features implemented - Ready for development

