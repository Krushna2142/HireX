from fastapi import FastAPI, UploadFile, HTTPException, Depends, Header
from fastapi.websockets import WebSocket
from pydantic import BaseModel
import psycopg2
import spacy
import requests
from transformers import AutoModelForCausalLM, AutoTokenizer
import firebase_admin
from firebase_admin import auth, credentials
import asyncio
import openai
from minio import Minio  # Add for file storage
import redis  # Add for caching
import bcrypt
from typing import Optional

app = FastAPI()

# CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://job-crawler-wine.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase
cred = credentials.Certificate("path/to/serviceAccount.json")
firebase_admin.initialize_app(cred)

# PostgreSQL (Docker service)
conn = psycopg2.connect(
    dbname="jobcrawler",
    user="postgres",
    password="postgres",
    host="postgres",  # Docker service name
    port="5432"
)
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

# Redis (Docker service)
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

# MinIO (Docker service)
minio_client = Minio(
    "minio:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)
bucket_name = "resumes"
if not minio_client.bucket_exists(bucket_name):
    minio_client.make_bucket(bucket_name)

# NLP and SLM
nlp = spacy.load("en_core_web_sm")
model_name = "microsoft/DialoGPT-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
openai.api_key = "your_openai_key"

# Pydantic
class User(BaseModel):
    email: str
    firebase_uid: str

class Job(BaseModel):
    title: str
    company: str
    skills: list

class CredentialsCreate(BaseModel):
    username: str
    password: str
    role: str  # 'candidate' or 'recruiter'

class CredentialsVerify(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt with increased cost factor for production"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def get_firebase_uid_from_header(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify Firebase token from Authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(' ')[1]
    return verify_token(token)

# Auth endpoints
@app.post("/auth/credentials/create")
async def create_credentials(
    credentials_data: CredentialsCreate,
    authorization: Optional[str] = Header(None)
):
    """Create user credentials after Google sign-in"""
    firebase_uid = get_firebase_uid_from_header(authorization)
    
    # Validate role
    if credentials_data.role not in ['candidate', 'recruiter']:
        raise HTTPException(status_code=400, detail="Role must be 'candidate' or 'recruiter'")
    
    # Hash the password
    password_hash = hash_password(credentials_data.password)
    
    cur = conn.cursor()
    try:
        # Check if user already exists
        cur.execute("SELECT id, credentials_complete FROM users WHERE firebase_uid = %s", (firebase_uid,))
        existing = cur.fetchone()
        
        if existing and existing[1]:  # credentials_complete is True
            raise HTTPException(status_code=400, detail="Credentials already exist for this user")
        
        # Check if username is already taken
        cur.execute("SELECT id FROM users WHERE username = %s", (credentials_data.username,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")
        
        if existing:
            # Update existing user record
            cur.execute("""
                UPDATE users 
                SET username = %s, password_hash = %s, role = %s, credentials_complete = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE firebase_uid = %s
            """, (credentials_data.username, password_hash, credentials_data.role, firebase_uid))
        else:
            # Create new user record
            cur.execute("""
                INSERT INTO users (firebase_uid, username, password_hash, role, credentials_complete)
                VALUES (%s, %s, %s, %s, TRUE)
            """, (firebase_uid, credentials_data.username, password_hash, credentials_data.role))
        
        conn.commit()
        return {"message": "Credentials created successfully", "role": credentials_data.role}
    except psycopg2.IntegrityError as e:
        conn.rollback()
        # Log the detailed error server-side
        print(f"Database integrity error: {str(e)}")
        raise HTTPException(status_code=400, detail="Unable to create credentials. Username may already be taken.")
    except Exception as e:
        conn.rollback()
        # Log the detailed error server-side
        print(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while creating credentials")
    finally:
        cur.close()

@app.post("/auth/credentials/verify")
async def verify_credentials(
    credentials_data: CredentialsVerify,
    authorization: Optional[str] = Header(None)
):
    """Verify existing user credentials"""
    firebase_uid = get_firebase_uid_from_header(authorization)
    
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT password_hash, role, credentials_complete 
            FROM users 
            WHERE firebase_uid = %s AND username = %s
        """, (firebase_uid, credentials_data.username))
        
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        password_hash, role, credentials_complete = user
        
        if not credentials_complete:
            raise HTTPException(status_code=400, detail="Credentials not complete")
        
        if not verify_password(credentials_data.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        return {"message": "Credentials verified", "role": role}
    finally:
        cur.close()

@app.get("/auth/credentials/check")
async def check_credentials(authorization: Optional[str] = Header(None)):
    """Check if user has completed credentials setup"""
    firebase_uid = get_firebase_uid_from_header(authorization)
    
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT credentials_complete, role, username 
            FROM users 
            WHERE firebase_uid = %s
        """, (firebase_uid,))
        
        user = cur.fetchone()
        if not user or not user[0]:
            return {"credentialsComplete": False}
        
        return {
            "credentialsComplete": True,
            "role": user[1],
            "username": user[2]
        }
    finally:
        cur.close()

@app.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    """Admin login endpoint - separate from regular user auth"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT password_hash, role 
            FROM users 
            WHERE username = %s AND role = 'admin'
        """, (login_data.username,))
        
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        
        password_hash, role = user
        
        if not verify_password(login_data.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        
        return {"message": "Admin login successful", "role": role}
    finally:
        cur.close()


@app.post("/upload-resume")
async def upload_resume(file: UploadFile, token: str = Depends(verify_token)):
    user_id = verify_token(token)
    content = await file.read()
    text = content.decode('utf-8')
    
    # Upload to MinIO
    file_path = f"{user_id}/{file.filename}"
    minio_client.put_object(bucket_name, file_path, content, len(content))
    
    # NLP
    doc = nlp(text)
    skills = [ent.text for ent in doc.ents if ent.label_ in ["SKILL", "ORG"]]
    
    # Store in DB
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO resumes (user_id, file_path, skills) 
        VALUES (%s, %s, %s)
    """, (user_id, file_path, skills))
    conn.commit()
    
    # Cache skills in Redis
    redis_client.set(f"skills:{user_id}", str(skills))
    
    # Fetch jobs
    jobs_response = requests.get(f"https://api.example.com/jobs?skills={','.join(skills)}").json()
    jobs = jobs_response.get('jobs', [])
    
    for job in jobs[:10]:
        cur.execute("""
            INSERT INTO jobs (title, company, skills, user_id) 
            VALUES (%s, %s, %s, %s)
        """, (job['title'], job['company'], job['skills'], user_id))
    conn.commit()
    
    return {"message": "Resume uploaded and analyzed", "skills": skills, "recommendations": jobs[:5]}

@app.websocket("/mock-interview")
async def mock_interview(websocket: WebSocket, token: str):
    user_id = verify_token(token)
    await websocket.accept()
    
    # Get skills from Redis
    skills = redis_client.get(f"skills:{user_id}")
    skills = eval(skills) if skills else []
    
    chat_history = f"User skills: {', '.join(skills)}. Start interview."
    
    while True:
        user_message = await websocket.receive_text()
        
        try:
            input_ids = tokenizer.encode(chat_history + user_message + tokenizer.eos_token, return_tensors="pt")
            response_ids = model.generate(input_ids, max_length=100, pad_token_id=tokenizer.eos_token_id)
            slm_response = tokenizer.decode(response_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
            await websocket.send_text(f"SLM: {slm_response}")
        except Exception as e:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": f"Mock interviewer for skills: {skills}."},
                    {"role": "user", "content": user_message}
                ]
            )
            await websocket.send_text(f"OpenAI: {response.choices[0].message.content}")
        
        chat_history += f"User: {user_message}\nAI: {slm_response or response.choices[0].message.content}\n"

@app.get("/jobs")
def get_jobs(token: str = Depends(verify_token)):
    user_id = verify_token(token)
    cur = conn.cursor()
    cur.execute("SELECT id, title, company, skills FROM jobs WHERE user_id = %s", (user_id,))
    jobs = cur.fetchall()
    return {"jobs": [{"id": j[0], "title": j[1], "company": j[2], "skills": j[3]} for j in jobs]}

@app.get("/alerts")
def get_alerts(token: str = Depends(verify_token)):
    alerts = [
        {"id": "1", "title": "New Match", "message": "2 roles match your profile", "severity": "info", "createdAt": "2025-12-07"}
    ]
    return {"alerts": alerts}