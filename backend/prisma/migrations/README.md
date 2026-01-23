# Database Migrations

## Tổng quan

Thư mục này chứa các migration SQL cho database.

## Migration Files

### 1. `20240101000000_add_user_and_auth.sql`
Migration cơ bản để thêm User table và update Channel table.
**Lưu ý**: Chỉ dùng nếu database chưa có dữ liệu hoặc muốn xóa toàn bộ dữ liệu cũ.

### 2. `20240101000001_add_user_safe_migration.sql`
Migration an toàn cho database đã có dữ liệu.
- Tạo User table
- Tạo system user để gán cho các channels cũ
- Update channels với user_id

## Cách chạy Migration

### Option 1: Dùng Prisma Migrate (Recommended)

```bash
cd backend
pnpm exec prisma migrate dev --name add_user_and_auth
```

Prisma sẽ tự động tạo migration từ schema.prisma.

### Option 2: Chạy SQL thủ công

1. **Nếu database CHƯA có dữ liệu** (development mới):
   ```bash
   psql $DATABASE_URL -f prisma/migrations/20240101000000_add_user_and_auth.sql
   ```

2. **Nếu database ĐÃ có dữ liệu** (production hoặc dev có data):
   ```bash
   psql $DATABASE_URL -f prisma/migrations/20240101000001_add_user_safe_migration.sql
   ```
   
   **Quan trọng**: Sau khi chạy migration, cần:
   - Đăng nhập với system user và đổi password
   - Hoặc tạo user mới và reassign channels

### Option 3: Dùng Prisma Studio để xem và chỉnh sửa

```bash
cd backend
pnpm exec prisma studio
```

## Migration Steps (Manual)

Nếu muốn chạy thủ công từng bước:

1. **Tạo User table:**
   ```sql
   CREATE TABLE users (
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
   ```

2. **Tạo indexes:**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_username ON users(username);
   ```

3. **Thêm user_id vào channels:**
   ```sql
   ALTER TABLE channels ADD COLUMN user_id UUID;
   ```

4. **Gán user_id cho channels hiện có** (nếu có):
   ```sql
   -- Tạo system user
   INSERT INTO users (email, username, password) 
   VALUES ('system@example.com', 'system', '$2b$10$...');
   
   -- Gán channels cho system user
   UPDATE channels 
   SET user_id = (SELECT id FROM users WHERE username = 'system')
   WHERE user_id IS NULL;
   ```

5. **Thêm constraint:**
   ```sql
   ALTER TABLE channels ALTER COLUMN user_id SET NOT NULL;
   ALTER TABLE channels 
   ADD CONSTRAINT fk_channels_user 
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
   
   CREATE INDEX idx_channels_user_id ON channels(user_id);
   ```

## Troubleshooting

### Lỗi: Column "user_id" does not exist
- Đảm bảo đã chạy migration để thêm column
- Kiểm tra schema.prisma đã có userId chưa

### Lỗi: Foreign key constraint violation
- Đảm bảo tất cả channels đã có user_id hợp lệ
- Kiểm tra users table đã có data chưa

### Lỗi: NOT NULL constraint violation
- Gán user_id cho tất cả channels trước khi set NOT NULL
- Dùng safe migration nếu có dữ liệu cũ

## Sau Migration

1. **Generate Prisma Client:**
   ```bash
   pnpm exec prisma generate
   ```

2. **Tạo user đầu tiên:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "username": "admin",
       "password": "password123"
     }'
   ```

3. **Kiểm tra migration:**
   ```bash
   pnpm exec prisma migrate status
   ```

