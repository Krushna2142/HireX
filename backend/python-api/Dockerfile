FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code (routers/, core/, utils/, services/, etc.)
COPY main.py .
COPY serviceAccount.json .
COPY routers/ ./routers/
COPY core/ ./core/
COPY utils/ ./utils/
COPY services/ ./services/

RUN python -m spacy download en_core_web_sm

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]