from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import pipeline
import os
import io
import json
from dotenv import load_dotenv
from openai import OpenAI

import numpy as np

# Patch for NeuroKit2 compatibility with older numpy versions
if not hasattr(np, 'trapezoid'):
    np.trapezoid = np.trapz

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
print(f"DEBUG: OpenAI API Key loaded: {api_key[:8]}...{api_key[-4:] if api_key else 'None'}")
client = OpenAI(api_key=api_key)

app = FastAPI(title="HRV Depression Screening API")

# Step 1: CORS Setup for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class AnalyzeRequest(BaseModel):
    rgb_means: List[List[float]]
    gender: int = 0 # 0: male, 1: female
    age: int = 30

@app.get("/")
def read_root():
    return {"status": "Healthy", "message": "HRV Depression API is online"}

@app.get("/user_db")
def get_user_db():
    """service/user_db.json 데이터를 로드하여 반환합니다."""
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "service", "user_db.json")
    try:
        if os.path.exists(db_path):
            with open(db_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # hrv_sessions가 문자열로 저장되어 있을 경우 파싱
                if isinstance(data.get("hrv_sessions"), str):
                    data["hrv_sessions"] = json.loads(data["hrv_sessions"])
                return data
        return {"hrv_sessions": [], "message": "DB file not found"}
    except Exception as e:
        print(f"Error loading user_db.json: {e}")
        return {"hrv_sessions": [], "error": str(e)}

@app.post("/analyze")
def analyze(data: AnalyzeRequest):
    """Step 4-13: Process a window of signals and return heart diagnosis results"""
    if len(data.rgb_means) < 900: # 30 seconds at 30 FPS
        raise HTTPException(status_code=400, detail="Insufficient data. Need at least 900 frames (30 seconds).")
    
    result = pipeline.pipeline.process_frames(data.rgb_means, data.gender, data.age)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.post("/chat")
def chat(data: ChatRequest):
    """OpenAI 기반 어르신 맞춤형 상담 챗봇"""
    try:
        # 시스템 프롬프트 추가
        system_prompt = {
            "role": "system",
            "content": "너는 어르신의 건강을 돌보는 따뜻하고 친절한 '마음 선생님'이야. 어르신이 이해하기 쉽게 천천히, 다정한 말투로 대답해줘. 공감을 많이 해드리고 가끔은 '수고하셨어요', '좋은 날이에요' 같은 칭찬도 섞어줘. 답변은 2-3문장 정도로 짧고 명확하게 해줘."
        }
        
        # 메시지 구성
        openai_messages = [system_prompt] + [{"role": m.role, "content": m.content} for m in data.messages]
        
        # 1. 텍스트 응답 생성
        response = client.chat.completions.create(
            model="gpt-4",
            messages=openai_messages,
            max_tokens=200
        )
        reply = response.choices[0].message.content
        
        # 2. TTS 생성 (Shimmer 목소리 고정)
        import base64
        tts_res = client.audio.speech.create(
            model="tts-1",
            voice="shimmer",
            input=reply
        )
        audio_base64 = base64.b64encode(tts_res.content).decode("utf-8")
        
        return {
            "reply": reply,
            "audio_base64": audio_base64,
            "suggested_choices": [] # 추후 필요시 추가
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tts")
async def tts(
    text: str = Query(..., description="Text to convert to speech"),
    voice: str = Query("nova", description="OpenAI voice: alloy, echo, fable, onyx, nova, shimmer")
):
    """Step 4: Convert question text to high-quality human speech using OpenAI with selectable voice"""
    print(f"DEBUG: Processing TTS request for voice [{voice}]: {text[:20]}...")
    try:
        # Validate voice
        valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice not in valid_voices:
            voice = "nova"
            
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        # Create a buffer from the response content
        audio_buffer = io.BytesIO(response.content)
        return StreamingResponse(audio_buffer, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
