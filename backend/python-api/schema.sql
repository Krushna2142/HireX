-- C:\Projects\Job-Crawler\backend\python-api\schema.sql (run in postgres container)
-- Updated users table for custom JWT auth system
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'candidate',
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_path VARCHAR(255),  -- For MinIO
    skills TEXT[]
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    company VARCHAR(255),
    skills TEXT[]
);