import os
import json
import psycopg2

PG_DSN = os.getenv("PG_DSN")  # e.g., postgresql://postgres:postgres@db:5432/jobcrawler

def save_analysis(user_id: str, analysis: dict) -> None:
    if not PG_DSN:
        return
    conn = psycopg2.connect(PG_DSN)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS resume_analyses (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            file_name TEXT,
            result JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute(
        "INSERT INTO resume_analyses (user_id, file_name, result) VALUES (%s, %s, %s)",
        (user_id, analysis.get("fileName"), json.dumps(analysis))
    )
    conn.commit()
    cur.close()
    conn.close()

def list_analyses(user_id: str | None = None, limit: int = 50) -> list[dict]:
    if not PG_DSN:
        return []
    conn = psycopg2.connect(PG_DSN)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS resume_analyses (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            file_name TEXT,
            result JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    if user_id:
        cur.execute(
            "SELECT id, user_id, file_name, result, created_at FROM resume_analyses WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
            (user_id, limit)
        )
    else:
        cur.execute(
            "SELECT id, user_id, file_name, result, created_at FROM resume_analyses ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "userId": r[1],
            "fileName": r[2],
            "result": r[3],
            "createdAt": r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4]),
        }
        for r in rows
    ]