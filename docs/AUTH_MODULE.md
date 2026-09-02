# Authentication Module

## Tổng quan

Module authentication đã được thêm vào dự án để quản lý users và bảo vệ các routes. Mỗi channel sẽ thuộc về một user cụ thể.

## Cấu trúc

```
backend/src/
├── auth/                      # Auth module
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts    # JWT passport strategy
│   ├── guards/
│   │   └── jwt-auth.guard.ts  # JWT guard
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
└── users/                     # Users module
    ├── users.module.ts
    ├── users.service.ts
    ├── users.controller.ts
    └── dto/
        ├── create-user.dto.ts
        └── update-user.dto.ts
```

## Database Schema

### User Model

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

### Channel Model (Updated)

```prisma
model Channel {
  // ... existing fields
  userId       String    @map("user_id")  // Thêm userId
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký user mới
  ```json
  {
    "email": "user@example.com",
    "username": "username",
    "password": "password123",
    "name": "User Name" // optional
  }
  ```

- `POST /api/auth/login` - Đăng nhập
  ```json
  {
    "emailOrUsername": "user@example.com", // hoặc username
    "password": "password123"
  }
  ```

Response:
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "name": "User Name"
  }
}
```

### Users

- `GET /api/users/me` - Lấy thông tin user hiện tại (Protected)
- `GET /api/users/:id` - Lấy thông tin user (Protected)
- `PATCH /api/users/:id` - Cập nhật user (Protected)
- `DELETE /api/users/:id` - Xóa user (Protected)

### Channels (Updated)

Tất cả endpoints channels đều được bảo vệ và chỉ trả về channels của user hiện tại:

- `POST /api/channels` - Tạo channel mới (tự động gán userId)
- `GET /api/channels` - Lấy danh sách channels của user hiện tại
- `GET /api/channels/:id` - Lấy channel (kiểm tra ownership)
- `PATCH /api/channels/:id` - Cập nhật channel (kiểm tra ownership)
- `DELETE /api/channels/:id` - Xóa channel (kiểm tra ownership)

## Usage

### Protected Routes

Sử dụng `@UseGuards(JwtAuthGuard)` để bảo vệ routes:

```typescript
@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  @Get()
  findAll(@CurrentUser() user: UserPublic) {
    // user.id là ID của user hiện tại
    return this.channelsService.findAll(user.id);
  }
}
```

### Get Current User

Sử dụng `@CurrentUser()` decorator để lấy thông tin user hiện tại:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: UserPublic) {
  return user;
}
```

### Service Level

Services nhận `userId` để filter hoặc check ownership:

```typescript
async findAll(userId: string) {
  return this.channelsRepository.findActiveChannelsByUserId(userId);
}

async findOne(id: string, userId: string) {
  const channel = await this.channelsRepository.findById(id);
  
  // Check ownership
  if (channel.userId !== userId) {
    throw new ForbiddenException('Access denied');
  }
  
  return channel;
}
```

## JWT Configuration

Trong `.env`:

```env
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
```

## Security Features

1. **Password Hashing**: Sử dụng bcrypt với salt rounds = 10
2. **JWT Authentication**: Token-based authentication
3. **Ownership Check**: Mỗi user chỉ có thể access channels của mình
4. **User Validation**: Kiểm tra email/username unique, password strength

## Migration

Sau khi thêm User model, cần chạy migration:

```bash
cd backend
pnpm exec prisma migrate dev --name add_user_and_auth
```

Migration sẽ:
- Tạo bảng `users`
- Thêm `user_id` vào bảng `channels`
- Tạo indexes cho users (email, username)
- Tạo foreign key relationship

## Testing

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "test@example.com",
    "password": "password123"
  }'
```

### Access Protected Route

```bash
curl -X GET http://localhost:3000/api/channels \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notes

- Webhook endpoints vẫn public (không cần authentication)
- User password được hash trước khi lưu vào database
- JWT token expires sau 7 ngày (có thể config)
- Cascade delete: Khi xóa user, tất cả channels của user cũng bị xóa

