import io
import pdfplumber
import docx
from sentence_transformers import SentenceTransformer
import numpy as np


model = SentenceTransformer('all-MiniLM-L6-v2')




def extract_text_and_skills(file_bytes: bytes):
# naive text extraction: try pdf first, then docx
text = ''
try:
with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
for p in pdf.pages:
text += p.extract_text() or ''
except Exception:
# try docx
try:
doc = docx.Document(io.BytesIO(file_bytes))
for p in doc.paragraphs:
text += p.text + '\n'
except Exception:
text = file_bytes.decode('utf-8', errors='ignore')


# very simple skill extraction by keyword matching (expand for prod)
common_skills = ['python','java','javascript','typescript','react','node','django','flask','sql','nosql','aws','docker','kubernetes','nlp','pytorch','tensorflow','machine learning','git']
lower = text.lower()
skills = [s for s in common_skills if s in lower]
return text, skills




def embed_text(text: str):
emb = model.encode(text).tolist()
return emb