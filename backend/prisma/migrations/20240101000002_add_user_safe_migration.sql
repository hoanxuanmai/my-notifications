-- Safe Migration: Add User table and update Channel with proper data handling
-- Use this if you have existing data in channels table

-- Step 1: Create User table
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

-- Step 2: Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Step 3: Add user_id column to channels (nullable first)
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 4: Create a default system user for existing channels
-- IMPORTANT: Change the password after first login!
INSERT INTO users (id, email, username, password, name)
VALUES (
  gen_random_uuid(),
  'system@my-notifications.local',
  'system',
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash or use a secure default
  'System User'
)
ON CONFLICT (email) DO NOTHING;

-- Step 5: Assign existing channels to system user
-- Only update if system user exists
UPDATE channels
SET user_id = (SELECT id FROM users WHERE username = 'system')
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE username = 'system');

-- Step 6: Make user_id NOT NULL
ALTER TABLE channels
ALTER COLUMN user_id SET NOT NULL;

-- Step 7: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_channels_user'
  ) THEN
    ALTER TABLE channels
    ADD CONSTRAINT fk_channels_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 8: Create index for user_id
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);

