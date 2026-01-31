from fastapi import APIRouter, HTTPException
from database import users_collection
from models import UserRegister, UserLogin
from security import hash_password, verify_password
from jwt_handler import create_token

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
        "password": hashed_password
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
