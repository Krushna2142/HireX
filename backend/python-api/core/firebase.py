import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore, auth

def _load_credential_from_env():
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw:
        return credentials.Certificate(json.loads(raw))

    b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64")
    if b64:
        decoded = base64.b64decode(b64).decode("utf-8")
        return credentials.Certificate(json.loads(decoded))

    path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if path and os.path.exists(path):
        return credentials.Certificate(path)

    # fallback
    if os.path.exists("serviceAccount.json"):
        return credentials.Certificate("serviceAccount.json")

    raise FileNotFoundError(
        "No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON, "
        "FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_PATH."
    )

if not firebase_admin._apps:
    firebase_admin.initialize_app(_load_credential_from_env())

db = firestore.client()
admin_auth = auth