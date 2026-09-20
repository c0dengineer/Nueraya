import json
import os
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Neuraya Screening API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

DOMAINS = ["social", "communication", "sensory", "regulation"]

class TextAnswers(BaseModel):
    answers: Dict[str, str] = Field(min_length=1)

@app.get("/")
def root():
    return {
        "service": "Neuraya Screening API",
        "status": "running",
        "health": "/health",
        "text_analysis": "/api/v1/analyze-text",
    }

def fallback_analysis(answers: Dict[str, str]) -> dict:
    """Conservative local fallback. The model-backed route below is preferred."""
    signals = {domain: 0 for domain in DOMAINS}
    vocabulary = {
        "social": ["eye contact", "respond", "name", "share", "play", "friend", "alone", "people"],
        "communication": ["talk", "word", "speak", "sound", "gesture", "communicate", "express", "repeat", "understand"],
        "sensory": ["sound", "noise", "ear", "texture", "food", "light", "touch", "clothes"],
        "regulation": ["meltdown", "upset", "calm", "routine", "change", "tantrum", "angry", "anxious"],
    }
    for section, text in answers.items():
        section_index = int(section.split("-")[0]) if "-" in section else 0
        domain = DOMAINS[min(max(section_index, 0), 3)]
        normalized = text.lower()
        signals[domain] = min(4, sum(term in normalized for term in vocabulary[domain]))
    return {"domain_signals": signals, "source": "local-fallback", "notes": "No AI provider is configured."}

def model_analysis(answers: Dict[str, str]) -> dict:
    from openai import OpenAI
    client = OpenAI()
    prompt = """You are a cautious developmental-screening language assistant. Analyze parent observations only for the four domains social, communication, sensory, regulation. This is not diagnosis. Return ONLY JSON: {\"domain_signals\": {\"social\":0-4,\"communication\":0-4,\"sensory\":0-4,\"regulation\":0-4}, \"notes\": {domain: short plain-language explanation}}. Treat negation carefully; do not infer conditions not stated.\n\nAnswers:\n""" + json.dumps(answers)
    response = client.responses.create(model=os.getenv("OPENAI_MODEL", "gpt-5"), input=prompt)
    data = json.loads(response.output_text)
    data["source"] = "model"
    return data

@app.get("/health")
def health():
    return {"status": "ok", "model_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/api/v1/analyze-text")
def analyze_text(payload: TextAnswers):
    clean = {key: value.strip()[:2000] for key, value in payload.answers.items() if value and value.strip()}
    if not clean:
        return fallback_analysis({})
    if not os.getenv("OPENAI_API_KEY"):
        return fallback_analysis(clean)
    try:
        return model_analysis(clean)
    except Exception:
        # Screening remains available if a provider is unavailable; no model error
        # details are exposed to the browser.
        return fallback_analysis(clean)
