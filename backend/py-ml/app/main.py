from fastapi import FastAPI
from pydantic import BaseModel
from resume_parser import extract_text_and_skills, embed_text
import requests


app = FastAPI()


class ExtractRequest(BaseModel):
url: str


class ExtractResponse(BaseModel):
text: str
skills: list
structured: dict
embedding: list


@app.post('/extract', response_model=ExtractResponse)
def extract(req: ExtractRequest):
# download file bytes
r = requests.get(req.url, timeout=20)
file_bytes = r.content
text, skills = extract_text_and_skills(file_bytes)
structured = {'text': text, 'skills': skills}
embedding = embed_text(text)
return {'text': text, 'skills': skills, 'structured': structured, 'embedding': embedding}