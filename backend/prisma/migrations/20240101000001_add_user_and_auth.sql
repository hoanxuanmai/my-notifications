-- Migration: Add User table and update Channel table with userId
-- Created: 2024-01-01

-- Create User table
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

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add userId column to channels table
-- Note: Nếu channels table đã có dữ liệu, cần xử lý dữ liệu cũ trước
-- Option 1: Xóa tất cả channels cũ (recommended cho development)
-- DELETE FROM channels;

-- Option 2: Tạo một default user và gán tất cả channels cũ cho user đó
-- INSERT INTO users (id, email, username, password) 
-- VALUES (gen_random_uuid(), 'default@example.com', 'default', '$2b$10$...');
-- UPDATE channels SET user_id = (SELECT id FROM users WHERE username = 'default');

-- Thêm column user_id vào channels
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Tạo foreign key constraint
-- Nếu channels đã có dữ liệu, cần có user_id hợp lệ trước khi thêm constraint
-- Tạm thời cho phép NULL để migrate an toàn
ALTER TABLE channels
ALTER COLUMN user_id SET NOT NULL;

-- Thêm foreign key (chạy sau khi đã có user_id hợp lệ cho tất cả records)
ALTER TABLE channels
ADD CONSTRAINT fk_channels_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Thêm index cho user_id
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);

