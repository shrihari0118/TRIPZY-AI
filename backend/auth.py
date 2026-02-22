from fastapi import APIRouter, HTTPException
from database import users_collection
from models import UserRegister, UserLogin, GoogleAuthRequest
from security import hash_password, verify_password
from jwt_handler import create_token
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
import os

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter()

@router.get("/auth-test")
def auth_test():
    count = users_collection.count_documents({})
    return {
        "message": "MongoDB connected",
        "users_count": count
    }

# REGISTER
@router.post("/register")
def register(user: UserRegister):

    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)

    users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "provider": "local"
    })

    return {"message": "User registered successfully"}

# LOGIN
@router.post("/login")
def login(user: UserLogin):

    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({
        "user_id": str(db_user["_id"]),
        "email": db_user["email"]
    })

    return {
        "message": "Login successful",
        "token": token,
        "name": db_user["name"]
    }

# GOOGLE SIGN-IN
@router.post("/auth/google")
def google_auth(payload: GoogleAuthRequest):
    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")
    google_id = idinfo.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # Look up by email or google_id
    db_user = users_collection.find_one({
        "$or": [{"email": email}, {"google_id": google_id}]
    })

    if db_user:
        # Existing user — merge google_id if missing (local user signing in with Google)
        if not db_user.get("google_id"):
            users_collection.update_one(
                {"_id": db_user["_id"]},
                {"$set": {"google_id": google_id, "avatar": picture}}
            )
    else:
        # New user — create account
        result = users_collection.insert_one({
            "name": name,
            "email": email,
            "password": None,
            "provider": "google",
            "google_id": google_id,
            "avatar": picture,
        })
        db_user = users_collection.find_one({"_id": result.inserted_id})

    token = create_token({
        "user_id": str(db_user["_id"]),
        "email": db_user["email"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(db_user["_id"]),
            "email": db_user["email"],
            "name": db_user.get("name", ""),
            "avatar": db_user.get("avatar", ""),
        },
        # Keep backward compat with existing frontend token storage
        "token": token,
        "name": db_user.get("name", ""),
    }

