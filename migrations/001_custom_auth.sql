-- Migration: Replace Supabase Auth / Firebase UID with custom JWT auth
-- Run this against your Supabase (Postgres) database

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update users table to support custom auth
-- If the table already exists with firebase_uid, run ALTER statements:

-- Option A: Fresh table creation (drop old one first if needed)
-- DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option B: Migrate existing users table (if it already exists)
-- Run these ALTER statements instead if the table already exists:
--
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;
-- -- Add unique constraint on email if not exists:
-- ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Index for faster reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token);
