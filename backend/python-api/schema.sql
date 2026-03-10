-- C:\Projects\Job-Crawler\backend\python-api\schema.sql (run in postgres container)
-- Updated schema: uses uuid primary key, removes firebase_uid dependency
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(255),  -- For MinIO
    skills TEXT[]
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    company VARCHAR(255),
    skills TEXT[]
);