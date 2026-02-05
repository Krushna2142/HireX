-- C:\Projects\Job-Crawler\backend\python-api\schema.sql (run in postgres container)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255)
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(firebase_uid),
    file_path VARCHAR(255),  -- For MinIO
    skills TEXT[]
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(firebase_uid),
    title VARCHAR(255),
    company VARCHAR(255),
    skills TEXT[]
);