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

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

if not GOOGLE_CLIENT_ID:
    raise Exception("GOOGLE_CLIENT_ID not found in environment variables")

# ---------------------------------------------------
# AUTH TEST
# ---------------------------------------------------

@router.get("/auth-test")
def auth_test():
    count = users_collection.count_documents({})
    return {
        "message": "MongoDB connected",
        "users_count": count
    }

# ---------------------------------------------------
# REGISTER
# ---------------------------------------------------

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

# ---------------------------------------------------
# LOGIN
# ---------------------------------------------------

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

# ---------------------------------------------------
# GOOGLE SIGN IN
# ---------------------------------------------------

@router.post("/auth/google")
def google_auth(payload: GoogleAuthRequest):

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Ensure token issued for this client
        if idinfo["aud"] != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Invalid audience")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    email = idinfo.get("email")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")
    google_id = idinfo.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # ---------------------------------------------------
    # FIND EXISTING USER
    # ---------------------------------------------------

    db_user = users_collection.find_one({
        "$or": [{"email": email}, {"google_id": google_id}]
    })

    # ---------------------------------------------------
    # IF USER EXISTS
    # ---------------------------------------------------

    if db_user:

        if not db_user.get("google_id"):
            users_collection.update_one(
                {"_id": db_user["_id"]},
                {
                    "$set": {
                        "google_id": google_id,
                        "avatar": picture,
                        "provider": "google"
                    }
                }
            )

    # ---------------------------------------------------
    # CREATE NEW USER
    # ---------------------------------------------------

    else:

        result = users_collection.insert_one({
            "name": name,
            "email": email,
            "password": None,
            "provider": "google",
            "google_id": google_id,
            "avatar": picture
        })

        db_user = users_collection.find_one({"_id": result.inserted_id})

    # ---------------------------------------------------
    # CREATE JWT TOKEN
    # ---------------------------------------------------

    token = create_token({
        "user_id": str(db_user["_id"]),
        "email": db_user["email"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "token": token,
        "name": db_user.get("name", ""),
        "user": {
            "id": str(db_user["_id"]),
            "email": db_user["email"],
            "name": db_user.get("name", ""),
            "avatar": db_user.get("avatar", "")
        }
    }