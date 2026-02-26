import os
from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

db_pool = pool.SimpleConnectionPool(minconn=1, maxconn=5, dsn=DATABASE_URL)

def get_conn():
    conn = db_pool.getconn()
    if conn is None:
        raise RuntimeError("Failed to get DB connection")
    return conn

def put_conn(conn):
    db_pool.putconn(conn)