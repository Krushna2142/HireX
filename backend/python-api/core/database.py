import os
import psycopg2

def get_db_connection():
    """Returns a psycopg2 connection using DATABASE_URL."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not set")

    conn = psycopg2.connect(database_url, connect_timeout=10)
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    return conn