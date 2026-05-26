-- Add password management columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temp_password boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;
