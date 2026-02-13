FROM python:3.11-slim

WORKDIR /app

COPY backend/python-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/python-api/main.py .
COPY backend/python-api/serviceAccount.json .
COPY backend/python-api/routers/ ./routers/
COPY backend/python-api/core/ ./core/
COPY backend/python-api/utils/ ./utils/
COPY backend/python-api/services/ ./services/

RUN python -m spacy download en_core_web_sm

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]