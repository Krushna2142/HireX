FROM python:3.11-slim

WORKDIR /app

# copy only requirements so pip layer can be cached
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the app
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]