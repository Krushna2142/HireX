# Job-Crawler Setup Guide

This guide will help you set up and run the Job-Crawler application with the new authentication flow.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Firebase project with Authentication enabled
- Python 3.9+ (for local development without Docker)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Krushna2142/Job-Crawler.git
cd Job-Crawler
```

### 2. Backend Setup

#### Configure Environment Variables

```bash
cd backend/python-api
cp .env.example .env
# Edit .env with your configuration
```

#### Start Backend Services with Docker

```bash
cd backend
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO on port 9000
- Python API on port 8000

#### Initialize the Database

Run the schema to create the necessary tables:

```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d JobCrawlerDB < python-api/schema.sql
```

#### Create an Admin User (Optional)

Connect to PostgreSQL and create an admin user:

```bash
docker exec -it $(docker ps -qf "name=postgres") psql -U postgres -d JobCrawlerDB
```

Then run:

```sql
INSERT INTO users (firebase_uid, email, username, password_hash, role, credentials_complete)
VALUES (
  'admin-firebase-uid',
  'admin@example.com',
  'admin',
  '$2b$12$your_bcrypt_hash_here',
  'admin',
  TRUE
);
```

To generate a bcrypt hash for your password, you can use Python:

```python
import bcrypt
password = "your_admin_password"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
print(hashed.decode('utf-8'))
```

### 3. Frontend Setup

#### Configure Environment Variables

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Firebase and API configuration
```

#### Install Dependencies

```bash
npm install
```

#### Start Development Server

```bash
npm run dev
```

The frontend will be available at http://localhost:3000

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Google Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
4. Get your configuration:
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Copy the Firebase configuration
5. Download the service account key:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely
   - Update `FIREBASE_SERVICE_ACCOUNT_PATH` in backend `.env`

## Testing the Authentication Flow

### 1. Test Google Sign-In

1. Navigate to http://localhost:3000
2. Click "Sign in with Google"
3. Complete Google authentication
4. You should be redirected to `/auth/credentials`

### 2. Test Credentials Creation

1. On the credentials page, select "New user"
2. Choose your role (Candidate or Recruiter)
3. Enter a username and password
4. Click "Create account"
5. You should be redirected to the dashboard

### 3. Test Credentials Verification

1. Sign out and sign in with Google again
2. On the credentials page, select "Existing user"
3. Enter your username and password
4. Click "Verify and continue"
5. You should be redirected to the dashboard

### 4. Test Admin Login

1. Navigate to http://localhost:3000/admin/login
2. Enter admin username and password
3. Click "Sign in"
4. You should be authenticated as admin

### 5. Test Protected Routes

1. Try accessing http://localhost:3000/dashboard without signing in
2. You should be redirected to the home page
3. Sign in and complete credentials
4. You should now be able to access protected routes

## API Endpoints

### Authentication Endpoints

#### Create Credentials
```bash
POST http://localhost:3000/api/auth/credentials/create
Headers:
  Authorization: Bearer <firebase-token>
Body:
  {
    "username": "johndoe",
    "password": "securepassword",
    "role": "candidate"
  }
```

#### Verify Credentials
```bash
POST http://localhost:3000/api/auth/credentials/verify
Headers:
  Authorization: Bearer <firebase-token>
Body:
  {
    "username": "johndoe",
    "password": "securepassword"
  }
```

#### Check Credentials
```bash
GET http://localhost:3000/api/auth/credentials/check
Headers:
  Authorization: Bearer <firebase-token>
```

#### Admin Login
```bash
POST http://localhost:3000/api/admin/login
Body:
  {
    "username": "admin",
    "password": "adminpassword"
  }
```

## Troubleshooting

### Backend Issues

**Database connection errors:**
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check connection settings in `.env`
- Verify database exists: `docker exec -it $(docker ps -qf "name=postgres") psql -U postgres -l`

**Redis connection errors:**
- Ensure Redis is running: `docker ps | grep redis`
- Test connection: `docker exec -it $(docker ps -qf "name=redis") redis-cli ping`

**Import errors:**
- Ensure all Python dependencies are installed
- Check requirements.txt matches installed packages

### Frontend Issues

**Firebase authentication not working:**
- Verify Firebase configuration in `.env.local`
- Check that Google sign-in is enabled in Firebase Console
- Ensure all `NEXT_PUBLIC_FIREBASE_*` variables are set

**API connection errors:**
- Verify `PYTHON_API_URL` is set in `.env.local`
- Ensure backend is running: `curl http://localhost:8000/jobs`
- Check CORS configuration in backend `main.py`

**Build errors:**
- Run `npm install` to ensure all dependencies are installed
- Clear `.next` directory: `rm -rf .next`
- Check for TypeScript errors: `npx tsc --noEmit`

## Production Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Ensure PostgreSQL database is provisioned
3. Run database migrations/schema
4. Deploy Python API container
5. Configure health checks and monitoring

### Frontend Deployment

1. Set environment variables (especially `PYTHON_API_URL`)
2. Build the application: `npm run build`
3. Deploy to Vercel, Netlify, or your preferred platform
4. Verify environment variables are accessible at runtime

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique passwords for admin accounts
- [ ] Enable HTTPS for all endpoints
- [ ] Set proper CORS origins in production
- [ ] Store sensitive data in environment variables, not in code
- [ ] Regular security audits and dependency updates
- [ ] Enable rate limiting on API endpoints
- [ ] Implement proper logging and monitoring

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the [AUTH_FLOW_IMPLEMENTATION.md](./AUTH_FLOW_IMPLEMENTATION.md) for detailed architecture
3. Open an issue on GitHub
