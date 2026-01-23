# Project Structure

Cấu trúc chi tiết của dự án My Notifications.

## Tổng quan

```
my-notifications/
├── backend/                    # NestJS Backend API
├── frontend/                   # Next.js Frontend
├── docs/                       # Tài liệu dự án
├── prisma/                     # Shared Prisma schema (root)
└── README.md                   # File README chính
```

## Backend Structure

```
backend/
├── src/
│   ├── app.module.ts           # Root module
│   ├── main.ts                 # Application entry point
│   │
│   ├── prisma/                 # Prisma module
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── channels/               # Channels module
│   │   ├── channels.module.ts
│   │   ├── channels.controller.ts
│   │   ├── channels.service.ts
│   │   └── dto/
│   │       ├── create-channel.dto.ts
│   │       └── update-channel.dto.ts
│   │
│   ├── notifications/          # Notifications module
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   └── dto/
│   │       ├── create-notification.dto.ts
│   │       └── notification-query.dto.ts
│   │
│   ├── webhooks/               # Webhooks module
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts
│   │   └── webhooks.service.ts
│   │
│   ├── websocket/              # WebSocket gateway
│   │   ├── notifications.module.ts
│   │   └── notifications.gateway.ts
│   │
│   └── cleanup/                # Cleanup service (cron)
│       ├── cleanup.module.ts
│       └── cleanup.service.ts
│
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   └── migrations/             # Database migrations
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

## Frontend Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React components
│   │   ├── channels/
│   │   │   └── ChannelsList.tsx
│   │   └── notifications/
│   │       └── NotificationsList.tsx
│   │
│   ├── lib/                    # Utilities & clients
│   │   ├── api.ts              # API client (Axios)
│   │   └── websocket.ts        # WebSocket client
│   │
│   ├── stores/                 # Zustand state management
│   │   └── notifications-store.ts
│   │
│   └── types/                  # TypeScript types
│       └── index.ts
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.local.example
```

## Module Dependencies

### Backend Modules Flow

```
AppModule
├── PrismaModule (Global)
├── ConfigModule (Global)
├── ScheduleModule (CleanupModule)
│
├── ChannelsModule
│   └── PrismaModule
│
├── NotificationsModule
│   ├── PrismaModule
│   └── NotificationsGatewayModule
│
├── WebhooksModule
│   ├── ChannelsModule
│   └── NotificationsModule
│
├── NotificationsGatewayModule
│
└── CleanupModule
    ├── PrismaModule
    └── ScheduleModule
```

### Frontend Dependencies

```
App (page.tsx)
├── ChannelsList
│   └── notifications-store (Zustand)
│
└── NotificationsList
    └── notifications-store (Zustand)

notifications-store
├── api.ts (API client)
└── websocket.ts (WebSocket client)
```

## Key Files Explained

### Backend

- **main.ts**: Bootstrap NestJS application, setup CORS, validation pipes
- **app.module.ts**: Root module, imports all feature modules
- **prisma.service.ts**: Prisma client wrapper, lifecycle management
- **channels.service.ts**: Business logic cho channels (CRUD)
- **notifications.service.ts**: Business logic cho notifications, emit WebSocket events
- **webhooks.service.ts**: Parse và xử lý webhook requests từ external systems
- **notifications.gateway.ts**: WebSocket gateway để broadcast notifications realtime
- **cleanup.service.ts**: Cron job để xóa dữ liệu hết hạn hàng ngày

### Frontend

- **page.tsx**: Main page, render ChannelsList và NotificationsList
- **notifications-store.ts**: Centralized state management với Zustand
- **api.ts**: Axios client với các API endpoints
- **websocket.ts**: Socket.io client để kết nối WebSocket
- **ChannelsList.tsx**: Component hiển thị danh sách channels
- **NotificationsList.tsx**: Component hiển thị danh sách notifications

## Data Flow

1. **Webhook → Notification**
   ```
   External System → POST /api/webhooks/:token
   → WebhooksService.parseWebhookBody()
   → NotificationsService.create()
   → Database (Prisma)
   → NotificationsGateway.emitNewNotification()
   → WebSocket → Frontend (realtime)
   ```

2. **Frontend → Backend**
   ```
   User Action → Component
   → notifications-store (Zustand)
   → api.ts (Axios)
   → Backend API
   → Service → Database
   ```

3. **Realtime Updates**
   ```
   Backend Event → NotificationsGateway
   → WebSocket emit
   → Frontend websocket.ts
   → notifications-store.on()
   → Component re-render
   ```

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Backend server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS
- `NODE_ENV`: Environment (development/production)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL

