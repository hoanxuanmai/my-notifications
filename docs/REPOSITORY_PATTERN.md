# Repository Pattern Implementation

## Tổng quan

Dự án đã được refactor để sử dụng **Repository Pattern** để quản lý ORM tốt hơn. Pattern này giúp:

- **Tách biệt business logic** khỏi database access
- **Dễ dàng test** (có thể mock repository)
- **Tái sử dụng code** với base repository
- **Dễ maintain** khi thay đổi ORM
- **Type-safe** với TypeScript

## Cấu trúc

```
backend/src/common/
├── enums/
│   └── notification.enum.ts      # Shared enums
├── types/
│   └── database.types.ts         # TypeScript types
└── repositories/
    ├── base.repository.ts        # Base repository với CRUD chung
    ├── channels.repository.ts    # Channels specific repository
    ├── notifications.repository.ts # Notifications specific repository
    └── repositories.module.ts    # Module exports
```

## Base Repository

`BaseRepository` cung cấp các methods chung cho tất cả repositories:

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

## Specific Repositories

### ChannelsRepository

```typescript
class ChannelsRepository extends BaseRepository<Channel> {
  findByWebhookToken(webhookToken: string, options?: {...}): Promise<Channel | null>
  findActiveChannels(include?: Prisma.ChannelInclude): Promise<ChannelWithCount[]>
  findExpiredChannels(): Promise<Channel[]>
}
```

### NotificationsRepository

```typescript
class NotificationsRepository extends BaseRepository<Notification> {
  findWithFilter(filter: NotificationFilter, pagination?: {...}, include?: {...}): Promise<PaginatedResponse<Notification>>
  countUnread(channelId?: string): Promise<number>
  markAsRead(id: string): Promise<Notification>
  markAllAsRead(channelId?: string): Promise<{ count: number }>
  findExpiredNotifications(): Promise<Notification[]>
}
```

## Shared Types & Enums

### Enums

Thay vì import trực tiếp từ `@prisma/client`, sử dụng shared enums:

```typescript
// ❌ Cũ
import { NotificationType } from '@prisma/client';

// ✅ Mới
import { NotificationType } from '../common/enums/notification.enum';
```

### Types

Các types được định nghĩa trong `database.types.ts`:

- `Channel`
- `Notification`
- `ChannelWithCount`
- `NotificationFilter`
- `PaginationOptions`
- `PaginatedResponse<T>`

## Cách sử dụng

### Trong Service

```typescript
@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelsRepository: ChannelsRepository
  ) {}

  async create(dto: CreateChannelDto) {
    // Sử dụng repository thay vì PrismaService trực tiếp
    return this.channelsRepository.create({
      ...dto,
      webhookToken: uuidv4(),
      expiresAt: addYears(new Date(), 1),
    });
  }
}
```

### Import từ common module

```typescript
// Import enums
import { NotificationType, NotificationPriority } from '../common/enums/notification.enum';

// Import types
import { NotificationFilter, PaginatedResponse } from '../common/types/database.types';

// Import repositories
import { ChannelsRepository } from '../common/repositories/channels.repository';
```

## Lợi ích

1. **Clean Code**: Services không phụ thuộc trực tiếp vào Prisma
2. **Testability**: Dễ mock repository trong unit tests
3. **Flexibility**: Có thể thay đổi ORM mà không ảnh hưởng services
4. **Reusability**: Base repository cung cấp CRUD chung
5. **Type Safety**: TypeScript types được định nghĩa rõ ràng
6. **Maintainability**: Logic database tập trung ở repository

## Migration Guide

### Thay đổi import enums

```typescript
// Trước
import { NotificationType } from '@prisma/client';

// Sau
import { NotificationType } from '../common/enums/notification.enum';
```

### Thay đổi enum values

```typescript
// Trước (lowercase từ Prisma)
NotificationType.info
NotificationPriority.medium

// Sau (uppercase trong shared enum)
NotificationType.INFO
NotificationPriority.MEDIUM
```

### Sử dụng repository thay vì PrismaService

```typescript
// Trước
constructor(private prisma: PrismaService) {}
await this.prisma.notification.findMany(...)

// Sau
constructor(private notificationsRepository: NotificationsRepository) {}
await this.notificationsRepository.findWithFilter(...)
```

## Best Practices

1. **Luôn sử dụng repository** thay vì PrismaService trực tiếp trong services
2. **Định nghĩa types** trong `common/types` thay vì dùng Prisma types trực tiếp
3. **Sử dụng shared enums** thay vì import từ `@prisma/client`
4. **Extend BaseRepository** khi tạo repository mới
5. **Export từ common/index.ts** để dễ import

