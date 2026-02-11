from fastapi import FastAPI, UploadFile, HTTPException, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi import WebSocketDisconnect
from firebase_admin import auth, credentials
import firebase_admin
import psycopg2
import os
import time
from passlib.hash import bcrypt 
import spacy
import openai
import asyncio
import ast

app = FastAPI()

# -------------------- CORS --------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://job-crawler-wine.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{path:path}", include_in_schema=False)
def options_handler():
    return {}

# -------------------- Firebase --------------------

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)

bearer = HTTPBearer()

def verify_token(credentials=Depends(bearer)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# -------------------- Database --------------------

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL not set")

    for attempt in range(5):
        try:
            conn = psycopg2.connect(database_url, connect_timeout=10)
            conn.set_isolation_level(
                psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
            )
            return conn
        except psycopg2.OperationalError as e:
            print(f"DB attempt {attempt+1} failed: {e}")
            time.sleep(1)

    raise Exception("Database connection failed")

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            firebase_uid TEXT NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            UNIQUE(firebase_uid, username)
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            skills TEXT
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            skills TEXT,
            user_id TEXT NOT NULL
        );
    """)

    cur.close()
    conn.close()

@app.on_event("startup")
def startup_event():
    print("Initializing database...")
    init_db()
    print("Database ready.")

# -------------------- NLP & AI --------------------

nlp = spacy.load("en_core_web_sm")

openai.api_base = "https://api.deepseek.com"
openai.api_key = os.getenv("DEEPSEEK_API_KEY")

# -------------------- AUTH --------------------

@app.post("/auth/credentials/create")
def create_credentials(user: dict, user_id: str = Depends(verify_token)):
    firebase_uid = user.get("firebase_uid") or user_id
    username = user["username"]
    password = user["password"][:72]
    password_hash = bcrypt.hash(password)
    role = user["role"]

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "INSERT INTO users (firebase_uid, username, password_hash, role) VALUES (%s, %s, %s, %s)",
            (firebase_uid, username, password_hash, role),
        )
    except psycopg2.IntegrityError:
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Credentials already exist")

    cur.close()
    conn.close()

    return {"message": "Created"}

@app.post("/auth/credentials/verify")
def verify_credentials(user: dict, user_id: str = Depends(verify_token)):
    firebase_uid = user.get("firebase_uid") or user_id
    username = user["username"]
    password = user["password"][:72]

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT password_hash FROM users WHERE firebase_uid = %s AND username = %s",
        (firebase_uid, username),
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if result and bcrypt.verify(password, result[0]):
        return {"message": "Verified"}

    raise HTTPException(status_code=401, detail="Invalid credentials")

# -------------------- RESUME UPLOAD --------------------

@app.post("/upload-resume")
async def upload_resume(file: UploadFile, user_id: str = Depends(verify_token)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    os.makedirs(f"uploads/{user_id}", exist_ok=True)
    file_path = f"uploads/{user_id}/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(content)

    doc = nlp(text)
    skills = [ent.text for ent in doc.ents]

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO resumes (user_id, file_path, skills) VALUES (%s, %s, %s)",
        (user_id, file_path, str(skills)),
    )

    cur.close()
    conn.close()

    return {"message": "Resume uploaded and analyzed", "skills": skills}

# -------------------- MOCK INTERVIEW (FIXED) --------------------

@app.websocket("/mock-interview")
async def mock_interview(websocket: WebSocket):

    await websocket.accept()

    try:
        token = websocket.query_params.get("token")

        if not token:
            await websocket.close(code=1008)
            return

        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token["uid"]

    except Exception as e:
        print("Token verification failed:", e)
        await websocket.close(code=1008)
        return

    # Fetch skills
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT skills FROM resumes WHERE user_id = %s ORDER BY id DESC LIMIT 1",
        (user_id,),
    )

    result = cur.fetchone()
    cur.close()
    conn.close()

    raw_skills = result[0] if result else "[]"

    try:
        skills = ast.literal_eval(raw_skills)
    except:
        skills = []

    try:
        while True:
            user_message = await websocket.receive_text()

            try:
                response = openai.ChatCompletion.create(
                    model="deepseek-chat",
                    messages=[
                        {
                            "role": "system",
                            "content": f"You are a professional mock interviewer. Conduct structured technical rounds based on: {skills}"
                        },
                        {
                            "role": "user",
                            "content": user_message
                        },
                    ],
                )

                ai_response = response.choices[0].message.content

            except Exception as e:
                ai_response = f"AI Error: {str(e)}"

            await websocket.send_text(ai_response)

    except WebSocketDisconnect:
        print("Client disconnected")

# -------------------- GET JOBS --------------------

@app.get("/jobs")
def get_jobs(user_id: str = Depends(verify_token)):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, title, company, skills FROM jobs WHERE user_id = %s",
        (user_id,),
    )

    jobs = cur.fetchall()
    cur.close()
    conn.close()

    return {
        "jobs": [
            {
                "id": j[0],
                "title": j[1],
                "company": j[2],
                "skills": j[3],
            }
            for j in jobs
        ]
    }

# -------------------- ALERTS --------------------

@app.get("/alerts")
def get_alerts(user_id: str = Depends(verify_token)):
    alerts = [
        {
            "id": "1",
            "title": "New Match",
            "message": "2 roles match your profile",
            "severity": "info",
            "createdAt": "2026-02-11"
        }
    ]
    return {"alerts": alerts}

# -------------------- HEALTH CHECK --------------------

@app.get("/")
def health():
    return {"status": "Backend running"}
