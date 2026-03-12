# backend/python-api/Dockerfile
FROM python:3.11-slim

# create non-root user to avoid permission issues in some hosts
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# copy requirements first for cache
COPY requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev curl && \
    pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

# copy app code
COPY . .

EXPOSE 8000

# use non-root user (optional)
# RUN useradd --create-home appuser
# USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]