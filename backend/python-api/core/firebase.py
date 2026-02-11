import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

if not firebase_admin._apps:
    cred = credentials.Certificate("firebase/serviceAccount.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
