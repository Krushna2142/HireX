# Authentication Flow Implementation

## Overview

This implementation adds a complete backend API for user credentials and admin login to the Job-Crawler application, providing a secure authentication flow that works with Google Sign-In and PostgreSQL for credential storage.

## Architecture

### Backend (Python/FastAPI)

The backend API (`backend/python-api/main.py`) provides the following endpoints:

1. **POST /auth/credentials/create** - Creates user credentials after Google sign-in
   - Requires Firebase authentication token
   - Validates role (candidate/recruiter)
   - Hashes passwords using bcrypt
   - Stores credentials in PostgreSQL

2. **POST /auth/credentials/verify** - Verifies existing user credentials
   - Requires Firebase authentication token
   - Validates username and password
   - Returns user role on success

3. **GET /auth/credentials/check** - Checks if user has completed credentials
   - Requires Firebase authentication token
   - Returns credentials status and user info

4. **POST /admin/login** - Admin authentication endpoint
   - Direct login without Google sign-in
   - Validates admin role in database
   - Returns admin role on success

### Frontend (Next.js)

The frontend implementation includes:

1. **API Routes** (`frontend/app/api/auth/credentials/` and `frontend/app/api/admin/`)
   - Proxy requests to Python backend
   - Handle Firebase token authentication
   - Provide consistent error handling

2. **Credentials Page** (`frontend/app/auth/credentials/page.tsx`)
   - Allows users to create or verify credentials after Google sign-in
   - Supports role selection (candidate/recruiter)
   - Calls backend API endpoints
   - Stores completion status in localStorage

3. **Admin Login Page** (`frontend/app/admin/login/page.tsx`)
   - Separate admin authentication flow
   - Direct credentials validation without Google
   - Stores admin session in localStorage

4. **Protected Layout** (`frontend/app/(protected)/layout.tsx`)
   - Enforces credential gate for protected routes
   - Checks both localStorage and backend API
   - Redirects to credentials page if not complete

## Authentication Flow

### Regular User Flow

1. User clicks "Sign in with Google" on homepage
2. Google authentication via Firebase
3. User is redirected to `/auth/credentials`
4. User either creates new credentials or verifies existing ones
5. Backend validates and stores credentials in PostgreSQL
6. User is redirected to `/dashboard`
7. Protected routes check credentials completion via:
   - Quick localStorage check
   - Backend API verification as fallback

### Admin Flow

1. Admin navigates to `/admin/login`
2. Enters admin username and password
3. Backend validates credentials and checks admin role
4. Admin is redirected to appropriate page
5. Admin session stored in localStorage

## Database Schema

The updated PostgreSQL schema (`backend/python-api/schema.sql`) includes:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('candidate', 'recruiter', 'admin')),
    credentials_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

1. **Password Hashing**: Uses bcrypt for secure password storage
2. **Firebase Authentication**: Validates Firebase tokens for API access
3. **Role-Based Access**: Enforces role checks for admin endpoints
4. **Input Validation**: Validates all user inputs on backend
5. **Error Handling**: Provides secure error messages without leaking sensitive info

## Environment Configuration

### Backend Environment Variables

Create `backend/python-api/.env`:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=JobCrawlerDB
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Krushna@123
REDIS_URL=redis://localhost:6379
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```bash
# Python API URL
PYTHON_API_URL=http://localhost:8000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Running the Application

### Start Backend Services

```bash
cd backend
docker-compose up -d
```

### Initialize Database

```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d JobCrawlerDB < python-api/schema.sql
```

### Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Testing the Flow

1. Navigate to http://localhost:3000
2. Click "Sign in with Google"
3. Complete Google authentication
4. Create credentials on `/auth/credentials` page
5. Verify redirect to dashboard
6. Test protected routes enforcement
7. Test admin login at `/admin/login`

## Notes

- Credentials are stored securely with bcrypt hashing
- Firebase tokens are used for API authentication
- Admin users must be created manually in the database with role='admin'
- The credential gate prevents access to protected routes until credentials are complete
- localStorage is used for quick checks with backend validation as fallback
