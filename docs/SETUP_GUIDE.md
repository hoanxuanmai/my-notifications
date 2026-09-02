# Hướng dẫn Setup Dự án

## Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL >= 14.x
- pnpm (Package Manager)

## Setup Backend (NestJS)

### 1. Cài đặt pnpm (nếu chưa có)

```bash
npm install -g pnpm
# hoặc
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. Tạo project NestJS

```bash
cd backend
pnpm add -g @nestjs/cli
nest new . --package-manager pnpm
```

### 3. Cài đặt dependencies

```bash
pnpm add @prisma/client
pnpm add -D prisma
pnpm add @nestjs/config @nestjs/schedule
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add class-validator class-transformer
```

### 4. Setup Prisma

```bash
# Copy schema từ root
cp ../prisma/schema.prisma ./prisma/

# Tạo .env file
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/my_notifications?schema=public"
PORT=3000
JWT_SECRET=your-secret-key
EOF

# Generate Prisma Client
pnpm exec prisma generate

# Chạy migration
pnpm exec prisma migrate dev --name init

# Chạy migration cho triggers và indexes bổ sung
psql $DATABASE_URL -f ../prisma/migrations/0001_setup_triggers_and_indexes.sql
```

### 5. Cấu trúc modules

Tạo các modules cơ bản:

```
src/
├── channels/
│   ├── channels.module.ts
│   ├── channels.controller.ts
│   ├── channels.service.ts
│   └── dto/
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── dto/
├── webhooks/
│   ├── webhooks.module.ts
│   ├── webhooks.controller.ts
│   └── webhooks.service.ts
├── websocket/
│   ├── notifications.gateway.ts
│   └── notifications.module.ts
├── cleanup/
│   ├── cleanup.service.ts
│   └── cleanup.module.ts
└── prisma/
    └── prisma.service.ts
```

### 6. Setup Cleanup Service

Tạo `src/cleanup/cleanup.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 2 * * *') // Chạy mỗi ngày lúc 2:00 AM
  async handleCleanup() {
    const result = await this.prisma.$queryRaw<
      Array<{ deleted_channels: bigint; deleted_notifications: bigint }>
    >`SELECT * FROM cleanup_expired_data()`;

    console.log('Cleanup completed:', result[0]);
  }
}
```

## Setup Frontend (Next.js)

### 1. Tạo project Next.js

```bash
cd frontend
pnpm dlx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm
```

### 2. Cài đặt dependencies

```bash
pnpm add zustand
pnpm add axios socket.io-client
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu # Tùy chọn UI components
pnpm add date-fns
```

### 3. Tạo .env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

## Development

### Chạy Backend

```bash
cd backend
pnpm run start:dev
```

### Chạy Frontend

```bash
cd frontend
pnpm run dev
```

## Database Migrations

### Tạo migration mới

```bash
cd backend
pnpm exec prisma migrate dev --name migration_name
```

### Xem database

```bash
pnpm exec prisma studio
```

## Notes

- Channels tự động hết hạn sau 1 năm (expires_at = created_at + 1 year)
- Notifications tự động hết hạn sau 1 tháng (expires_at = created_at + 1 month)
- Cleanup job chạy tự động mỗi ngày lúc 2:00 AM
- Webhook URL format: `/api/webhooks/{webhook_token}`

