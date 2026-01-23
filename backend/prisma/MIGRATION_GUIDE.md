# Migration Guide cho Users và Auth

## Cách 1: Sử dụng Prisma Migrate (Khuyến nghị)

Prisma sẽ tự động tạo migration từ schema.prisma:

```bash
cd backend

# 1. Generate Prisma Client (nếu chưa)
pnpm exec prisma generate

# 2. Tạo migration
pnpm exec prisma migrate dev --name add_user_and_auth

# Prisma sẽ:
# - Tạo migration file trong prisma/migrations/
# - Apply migration vào database
# - Generate Prisma Client mới
```

**Lưu ý**: Nếu database đã có dữ liệu trong `channels` table, Prisma sẽ yêu cầu bạn xử lý:
- Option 1: Reset database (xóa toàn bộ data)
- Option 2: Tạo migration có `ALTER COLUMN` và xử lý dữ liệu cũ

## Cách 2: Chạy SQL thủ công

### Nếu database CHƯA có dữ liệu (fresh database):

```bash
# Chạy migration cơ bản
psql $DATABASE_URL -f prisma/migrations/20240101000000_add_user_and_auth.sql

# Chạy triggers và indexes
psql $DATABASE_URL -f ../../prisma/migrations/0001_setup_triggers_and_indexes.sql
```

**Lưu ý**: Migration này yêu cầu channels table phải empty hoặc đã có user_id hợp lệ.

### Nếu database ĐÃ có dữ liệu (existing database):

```bash
# Chạy safe migration (tự động tạo system user và gán channels)
psql $DATABASE_URL -f prisma/migrations/20240101000001_add_user_safe_migration.sql

# Chạy triggers và indexes (nếu chưa chạy)
psql $DATABASE_URL -f ../../prisma/migrations/0001_setup_triggers_and_indexes.sql
```

**Quan trọng**: Sau khi chạy safe migration:
1. System user được tạo với email: `system@my-notifications.local`
2. Tất cả channels cũ được gán cho system user
3. Cần đổi password cho system user hoặc tạo user mới và reassign channels

## Cách 3: Migration thủ công từng bước

### Step 1: Tạo User table

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

### Step 2: Thêm user_id vào channels

```sql
-- Thêm column (nullable first)
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS user_id UUID;
```

### Step 3: Xử lý dữ liệu cũ (nếu có)

**Option A: Tạo system user và gán channels**

```sql
-- Tạo system user
INSERT INTO users (id, email, username, password, name)
VALUES (
  gen_random_uuid(),
  'system@my-notifications.local',
  'system',
  '$2b$10$YourHashedPasswordHere', -- Thay bằng bcrypt hash thật
  'System User'
)
ON CONFLICT (email) DO NOTHING;

-- Gán channels cho system user
UPDATE channels
SET user_id = (SELECT id FROM users WHERE username = 'system')
WHERE user_id IS NULL;
```

**Option B: Xóa tất cả channels cũ**

```sql
DELETE FROM channels;
```

### Step 4: Thêm constraints

```sql
-- Make user_id NOT NULL
ALTER TABLE channels
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key
ALTER TABLE channels
ADD CONSTRAINT fk_channels_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
```

### Step 5: Generate Prisma Client

```bash
cd backend
pnpm exec prisma generate
```

## Sau Migration

### 1. Tạo user đầu tiên

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "password123"
  }'
```

### 2. Đăng nhập và lấy token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin@example.com",
    "password": "password123"
  }'
```

### 3. Sử dụng token để access protected routes

```bash
curl -X GET http://localhost:3000/api/channels \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Kiểm tra Migration

### Xem migration status (Prisma)

```bash
cd backend
pnpm exec prisma migrate status
```

### Kiểm tra trong database

```sql
-- Kiểm tra User table
SELECT * FROM users;

-- Kiểm tra channels có user_id
SELECT id, name, user_id FROM channels LIMIT 10;

-- Kiểm tra foreign key
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'channels';
```

## Troubleshooting

### Lỗi: relation "users" does not exist
→ Chưa chạy migration tạo User table. Chạy lại Step 1.

### Lỗi: column "user_id" does not exist
→ Chưa thêm column. Chạy Step 2.

### Lỗi: NOT NULL constraint violation
→ Có channels chưa có user_id. Chạy Step 3 để gán user_id.

### Lỗi: Foreign key constraint violation
→ user_id không hợp lệ hoặc user không tồn tại. Kiểm tra dữ liệu.

### Lỗi: Unique constraint violation (email/username)
→ Email hoặc username đã tồn tại. Dùng email/username khác.

## Rollback (nếu cần)

```sql
-- Xóa foreign key
ALTER TABLE channels DROP CONSTRAINT IF EXISTS fk_channels_user;

-- Xóa index
DROP INDEX IF EXISTS idx_channels_user_id;

-- Xóa column
ALTER TABLE channels DROP COLUMN IF EXISTS user_id;

-- Xóa table (cẩn thận!)
DROP TABLE IF EXISTS users CASCADE;
```

