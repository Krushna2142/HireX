from fastapi import FastAPI, UploadFile, HTTPException, Depends
from fastapi.websockets import WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import spacy
import requests
import firebase_admin
from firebase_admin import auth, credentials
import asyncio
import openai
from passlib.hash import bcrypt
import smtplib
import os  # For environment variables
import ast  # For safely parsing stored skills representations
import time  # For connection retries

app = FastAPI()


def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://job-crawler-wine.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        print(f"Connecting to Supabase database...")
        for attempt in range(5):
            try:
                conn = psycopg2.connect(database_url, connect_timeout=10)  # Removed family=2; timeout kept
                print("Connected to database: True")
                return conn
            except psycopg2.OperationalError as e:
                print(f"Connection attempt {attempt + 1} failed: {e}")
                if attempt < 4:
                    time.sleep(1)
        raise Exception("Failed to connect to database after 5 attempts")
    # Fallback code...
    db_name = os.getenv("POSTGRES_DB", "jobcrawlerdb")
    db_user = os.getenv("POSTGRES_USER", "jobcrawlerdb_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "")
    db_host = os.getenv("POSTGRES_HOST", "postgres")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port,
    )
    print("Connected to database: False (using fallback env vars)")
    return conn


conn = get_db_connection()
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)


def init_db():
    """
    Ensure required tables exist in production so requests
    don't crash with UndefinedTable errors.
    """
    cur = conn.cursor()
    # Users table for credentials
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            firebase_uid TEXT NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            UNIQUE(firebase_uid, username)
        );
        """
    )
    # Resumes table for uploaded resumes / skills
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS resumes (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            skills TEXT
        );
        """
    )
    # Jobs table for recommendations
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            skills TEXT,
            user_id TEXT NOT NULL
        );
        """
    )
    conn.commit()


init_db()

nlp = spacy.load("en_core_web_sm")

# Control use of local transformers SLM via env var to avoid OOM on small instances.
USE_LOCAL_SLM = os.getenv("USE_LOCAL_SLM", "false").lower() == "true"
tokenizer = None
model = None

if USE_LOCAL_SLM:
    from transformers import AutoModelForCausalLM, AutoTokenizer

    _model_name = "microsoft/DialoGPT-small"
    tokenizer = AutoTokenizer.from_pretrained(_model_name)
    model = AutoModelForCausalLM.from_pretrained(_model_name)

openai.api_key = os.getenv("OPENAI_API_KEY", "your_openai_key")

class User(BaseModel):
    email: str
    firebase_uid: str

class Job(BaseModel):
    title: str
    company: str
    skills: list

@app.post("/auth/credentials/create")
def create_credentials(user: dict, user_id: str = Depends(verify_token)):
    """
    Create username/password credentials linked to the Firebase user.
    """
    firebase_uid = user.get("firebase_uid") or user_id
    username = user["username"]
    password = bcrypt.hash(user["password"])
    role = user["role"]

    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (firebase_uid, username, password_hash, role) VALUES (%s, %s, %s, %s)",
            (firebase_uid, username, password, role),
        )
        conn.commit()
    except psycopg2.IntegrityError:
        # Duplicate (firebase_uid, username)
        conn.rollback()
        raise HTTPException(status_code=409, detail="Credentials already exist")

    return {"message": "Created"}

@app.post("/auth/credentials/verify")
def verify_credentials(user: dict, user_id: str = Depends(verify_token)):
    """
    Verify username/password for the current Firebase user.
    """
    firebase_uid = user.get("firebase_uid") or user_id
    username = user["username"]
    cur = conn.cursor()
    cur.execute("SELECT password_hash FROM users WHERE firebase_uid = %s AND username = %s", (firebase_uid, username))
    result = cur.fetchone()
    if result and bcrypt.verify(user['password'], result[0]):
        return {"message": "Verified"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/auth/reset-password")
def reset_password(data: dict):
    email = data['email']
    print(f"Reset for {email}")
    return {"message": "Sent"}

@app.post("/upload-resume")
async def upload_resume(file: UploadFile, user_id: str = Depends(verify_token)):
    content = await file.read()
    text = content.decode('utf-8')
    # Save to local filesystem (temporary)
    os.makedirs(f"uploads/{user_id}", exist_ok=True)
    file_path = f"uploads/{user_id}/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)
    
    doc = nlp(text)
    skills = [ent.text for ent in doc.ents if ent.label_ in ["SKILL", "ORG"]]
    cur = conn.cursor()
    cur.execute("INSERT INTO resumes (user_id, file_path, skills) VALUES (%s, %s, %s)", (user_id, file_path, skills))
    conn.commit()
    jobs_response = requests.get(f"https://api.example.com/jobs?skills={','.join(skills)}").json()
    jobs = jobs_response.get('jobs', [])
    for job in jobs[:10]:
        cur.execute("INSERT INTO jobs (title, company, skills, user_id) VALUES (%s, %s, %s, %s)", (job['title'], job['company'], job['skills'], user_id))
    conn.commit()
    return {"message": "Resume uploaded and analyzed", "skills": skills, "recommendations": jobs[:5]}

@app.websocket("/mock-interview")
async def mock_interview(websocket: WebSocket, token: str):
    user_id = verify_token(token)
    await websocket.accept()
    # Fetch skills from DB; tolerate missing table or rows
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT skills FROM resumes WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,),
        )
        result = cur.fetchone()
        raw_skills = result[0] if result else []
    except psycopg2.errors.UndefinedTable:
        # If the resumes table does not exist yet, proceed with empty skills
        raw_skills = []

    # Normalize skills into a list of strings regardless of how they are stored in the DB.
    skills: list[str]
    if isinstance(raw_skills, (list, tuple)):
        skills = [str(s) for s in raw_skills]
    elif isinstance(raw_skills, str):
        # Attempt to parse string representations like "['Python', 'SQL']"
        parsed = None
        try:
            parsed = ast.literal_eval(raw_skills)
        except (SyntaxError, ValueError):
            parsed = None

        if isinstance(parsed, (list, tuple)):
            skills = [str(s) for s in parsed]
        elif raw_skills:
            skills = [raw_skills]
        else:
            skills = []
    elif raw_skills is None:
        skills = []
    else:
        skills = [str(raw_skills)]

    chat_history = f"User skills: {', '.join(skills)}. Start interview."
    while True:
        user_message = await websocket.receive_text()
        slm_response = None
        openai_response_text = None

        if USE_LOCAL_SLM and tokenizer is not None and model is not None:
            try:
                input_ids = tokenizer.encode(
                    chat_history + user_message + tokenizer.eos_token,
                    return_tensors="pt",
                )
                response_ids = model.generate(
                    input_ids,
                    max_length=100,
                    pad_token_id=tokenizer.eos_token_id,
                )
                slm_response = tokenizer.decode(
                    response_ids[:, input_ids.shape[-1] :][0],
                    skip_special_tokens=True,
                )
                await websocket.send_text(f"SLM: {slm_response}")
            except Exception:
                slm_response = None

        if slm_response is None:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"Mock interviewer for skills: {skills}.",
                    },
                    {"role": "user", "content": user_message},
                ],
            )
            openai_response_text = response.choices[0].message.content
            await websocket.send_text(f"OpenAI: {openai_response_text}")

        final_reply = (
            slm_response
            if slm_response is not None
            else openai_response_text or ""
        )
        chat_history += f"User: {user_message}\nAI: {final_reply}\n"

@app.get("/jobs")
def get_jobs(user_id: str = Depends(verify_token)):
    cur = conn.cursor()
    cur.execute("SELECT id, title, company, skills FROM jobs WHERE user_id = %s", (user_id,))
    jobs = cur.fetchall()
    return {"jobs": [{"id": j[0], "title": j[1], "company": j[2], "skills": j[3]} for j in jobs]}

@app.get("/alerts")
def get_alerts(token: str = Depends(verify_token)):
    alerts = [{"id": "1", "title": "New Match", "message": "2 roles match your profile", "severity": "info", "createdAt": "2025-12-07"}]
    return {"alerts": alerts}