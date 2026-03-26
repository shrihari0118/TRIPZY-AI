from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

client = MongoClient(MONGO_URL)

db = client["travel_ai"]

users_collection = db["users"]

# ── Budget Planner data collections ────────────────────────────────────────────
accommodation_collection = db["accomodation_datas"]
activity_collection      = db["activity_datas"]
food_collection          = db["food_datas"]
spot_collection          = db["tourist_spot_datas"]
transport_collection     = db["transport_datas"]
