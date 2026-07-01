from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())

db = client['finance_tracker']
records_collection = db['records']

def save_record(data):
    result = records_collection.insert_one(data)
    return str(result.inserted_id)

def get_all_records():
    records = list(records_collection.find())
    for record in records:
        record['_id'] = str(record['_id'])
    return records