from fastapi import FastAPI, UploadFile, HTTPException, Depends
from fastapi.websockets import WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import spacy
import requests
from transformers import AutoModelForCausalLM, AutoTokenizer
import firebase_admin
from firebase_admin import auth, credentials
import asyncio
import openai
from minio import Minio
import redis
from passlib.hash import bcrypt
import smtplib

app = FastAPI()

def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except:
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

conn = psycopg2.connect(
    dbname="jobcrawler",
    user="postgres",
    password="postgres",
    host="postgres",
    port="5432"
)
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

minio_client = Minio(
    "minio:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)
bucket_name = "resumes"
if not minio_client.bucket_exists(bucket_name):
    minio_client.make_bucket(bucket_name)

nlp = spacy.load("en_core_web_sm")
model_name = "microsoft/DialoGPT-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
openai.api_key = "your_openai_key"

class User(BaseModel):
    email: str
    firebase_uid: str

class Job(BaseModel):
    title: str
    company: str
    skills: list

@app.post("/auth/credentials/create")
def create_credentials(user: dict, token: str = Depends(verify_token)):
    firebase_uid = user['firebase_uid'] or token
    username = user['username']
    password = bcrypt.hash(user['password'])
    role = user['role']
    cur = conn.cursor()
    cur.execute("INSERT INTO users (firebase_uid, username, password_hash, role) VALUES (%s, %s, %s, %s)",
                (firebase_uid, username, password, role))
    conn.commit()
    return {"message": "Created"}

@app.post("/auth/credentials/verify")
def verify_credentials(user: dict, token: str = Depends(verify_token)):
    firebase_uid = user['firebase_uid'] or token
    username = user['username']
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
async def upload_resume(file: UploadFile, token: str = Depends(verify_token)):
    user_id = verify_token(token)
    content = await file.read()
    text = content.decode('utf-8')
    file_path = f"{user_id}/{file.filename}"
    minio_client.put_object(bucket_name, file_path, content, len(content))
    doc = nlp(text)
    skills = [ent.text for ent in doc.ents if ent.label_ in ["SKILL", "ORG"]]
    cur = conn.cursor()
    cur.execute("INSERT INTO resumes (user_id, file_path, skills) VALUES (%s, %s, %s)", (user_id, file_path, skills))
    conn.commit()
    redis_client.set(f"skills:{user_id}", str(skills))
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
        except:
            response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[{"role": "system", "content": f"Mock interviewer for skills: {skills}."}, {"role": "user", "content": user_message}])
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
    alerts = [{"id": "1", "title": "New Match", "message": "2 roles match your profile", "severity": "info", "createdAt": "2025-12-07"}]
    return {"alerts": alerts}