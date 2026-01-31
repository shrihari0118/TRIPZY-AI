from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "travel_ai_secret_key"
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24   # 1 day

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token
