# Backend API Setup

## Environment Variables

Create a `.env` file in the `backend/python-api` directory with the following variables:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=JobCrawlerDB
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Krushna@123

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/serviceAccount.json

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key
```

## Running with Docker Compose

From the `backend` directory:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO on port 9000
- Python API on port 8000

## Database Setup

After starting the services, run the schema:

```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d JobCrawlerDB < python-api/schema.sql
```

## API Endpoints

### Authentication

- **POST** `/auth/credentials/create` - Create user credentials (requires Firebase token)
- **POST** `/auth/credentials/verify` - Verify existing credentials (requires Firebase token)
- **GET** `/auth/credentials/check` - Check if credentials are complete (requires Firebase token)
- **POST** `/admin/login` - Admin login (no Firebase token needed)

### Other Endpoints

- **POST** `/upload-resume` - Upload and analyze resume
- **WebSocket** `/mock-interview` - Mock interview session
- **GET** `/jobs` - Get job recommendations
- **GET** `/alerts` - Get user alerts

## Frontend Configuration

In the frontend `.env.local`:

```bash
# Python API URL (for backend communication)
PYTHON_API_URL=http://localhost:8000

# Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```
