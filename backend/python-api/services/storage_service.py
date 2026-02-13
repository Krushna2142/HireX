import os
import shutil
import uuid

UPLOAD_DIR = os.getenv("RESUME_UPLOAD_DIR", "resumes")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_resume_file(file):
    file_id = str(uuid.uuid4())
    file_path = f"{UPLOAD_DIR}/{file_id}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path, file_id