from pymongo import MongoClient
import sys
from .config import MONGODB_URI

def get_mongo_client():
    return MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=20000,
        retryWrites=True
    )

client = get_mongo_client()
db = client['online_exam_portal']

# Collections
users_collection = db['users']
exams_collection = db['exams']
submissions_collection = db['submissions']

try:
    # Ensure index
    users_collection.create_index("email", unique=True)
except Exception as e:
    print(f"Notice: MongoDB index setup notice ({e})")
