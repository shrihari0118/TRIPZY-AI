from fastapi import FastAPI
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins (perfect for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Request body structure
class TranslationRequest(BaseModel):
    text: str
    target_language: str


@app.get("/")
def home():
    return {"message": "Translator API is running"}


@app.post("/translate")
def translate_text(request: TranslationRequest):

    translated_text = GoogleTranslator(
        source="auto",
        target=request.target_language
    ).translate(request.text)

    return {
        "translated_text": translated_text
    }
#done by sadhana
from auth import router as auth_router
app.include_router(auth_router)
