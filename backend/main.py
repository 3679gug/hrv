from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
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
    summary_context: Optional[str] = None

class AnalyzeRequest(BaseModel):
    rgb_means: List[List[float]]
    gender: int = 0 # 0: male, 1: female
    age: int = 30

class SaveDataRequest(BaseModel):
    data: dict

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

SESSION_ARC = """【세션 흐름 가이드라인】
아래는 전문적인 CBT 및 행동활성화(BA) 원칙을 바탕으로 한 7단계 대화 흐름입니다.
대화의 맥락에 따라 유연하게 적용하되, 사용자가 다음 단계로 자연스럽게 이동하도록 유도하세요.

① 안부(Greeting): 시작 인사 및 전반적인 대화 시작
② 체크인(Check-in): 현재의 에너지 수준, 기분, 수면 상태 확인
③ 상황(Situation): 최근에 강한 감정을 느꼈던 구체적인 상황 탐색
④ 생각(Thought): 그 상황에서 머릿속에 어떤 생각이 스쳤는지 탐색
⑤ 감정 및 감각(Emotion & Sensation): 느껴지는 감정과 몸의 반응 인식
⑥ 패턴 요약(Pattern Summary): `상황 -> 생각 -> 감정 -> 행동`의 연결 고리를 요약
⑦ 대응 및 마무리(Action & Close): 실천할 수 있는 작은 행동 제안 및 마무리"""

def score_mood(user_input: str) -> Optional[int]:
    """사용자 발화에서 기분 점수(0-10) 추출"""
    if not user_input.strip(): return None
    try:
        res = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": (
                    "다음 발화에서 화자의 기분을 0~10 정수 하나만 출력하세요.\n"
                    "0=극도로 우울/나쁨, 5=보통, 10=매우 좋음.\n"
                    f"발화: {user_input[:200]}"
                )
            }],
            max_tokens=3,
            temperature=0
        )
        return max(0, min(10, int(res.choices[0].message.content.strip())))
    except Exception:
        return None

@app.post("/chat")
def chat(data: ChatRequest):
    """OpenAI 기반 어르신 맞춤형 상담 챗봇 (CBT & BA 로직 반영)"""
    try:
        user_input = data.messages[-1].content if data.messages else ""
        
        summary = getattr(data, 'summary_context', None)
        summary_text = summary if summary else "어제 특별한 활동 기록 없음"

        system_content = (
            "당신은 행동활성화(BA)와 인지행동치료(CBT) 전문 '마음이음' 상담사입니다. "
            "사용자를 다정하게 대하며, 친구처럼 편안하면서도 전문적인 통찰을 제공하세요.\n\n"
            f"{SESSION_ARC}\n\n"
            "【핵심 상담 규칙】\n"
            "1. **공감 및 지지**: 사용자의 말에 먼저 충분히 공감해주세요.\n"
            "2. **이모지 금지**: 어떠한 이모지도 절대 사용하지 마세요. 오직 텍스트로만 따뜻하게 대화하세요.\n"
            "3. **패턴 중심**: 상황 공유 시, 인지적 함정이나 패턴을 명확히 요약해주고 공감을 받으세요.\n"
            "4. **연속성 유지(전날 활동 질문)**: 제공된 '추가 맥락'을 참고하여 전날 진행했던 활동이 있다면 안부를 물으세요.\n"
            "5. **간결성**: 한 번의 답변은 2~3문장 이내로 하세요.\n\n"
            "【추가 맥락 (전날 기록)】\n"
            f"{summary_text}\n\n"
            "【응답 형식】\n"
            "반드시 아래의 JSON 형식으로만 답변하세요:\n"
            "{\n"
            "  \"reply\": \"(사용자에게 보낼 따뜻한 상담 메시지)\",\n"
            "  \"choices\": [\n"
            "    {\"emoji\": \"\", \"label\": \"(짧은 버튼 텍스트)\", \"text\": \"(클릭 시 전송될 전체 문장)\"}\n"
            "  ]\n"
            "}\n"
            "- choices는 사용자가 다음에 할 법한 말을 3~4개 생성하세요. emoji는 빈 문자열로 두세요."
        )
        
        openai_messages = [{"role": "system", "content": system_content}] + [{"role": m.role, "content": m.content} for m in data.messages]
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=openai_messages,
            response_format={ "type": "json_object" },
            temperature=0.9
        )
        
        res_data = json.loads(response.choices[0].message.content)
        reply = res_data.get("reply", "")
        suggested_choices = res_data.get("choices", [])
        
        mood_score = score_mood(user_input)
        
        import base64
        audio_base64 = None
        try:
            tts_res = client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=reply
            )
            audio_base64 = base64.b64encode(tts_res.content).decode("utf-8")
        except Exception as e:
            print("TTS Error:", e)
        
        return {
            "reply": reply,
            "audio_base64": audio_base64,
            "mood_score": mood_score,
            "suggested_choices": suggested_choices
        }
    except Exception as e:
        import traceback
        print(f"Chat Error: {traceback.format_exc()}")
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

@app.get("/api/get_data")
def get_data():
    """user_db.json에서 데이터를 로드하여 반환"""
    db_path = r"d:\hrvdata\service\user_db.json"
    try:
        if os.path.exists(db_path):
            with open(db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"error": "File not found", "path": db_path}
    except Exception as e:
        print(f"Error loading data: {e}")
        return {"error": str(e)}

@app.post("/api/save_data")
def save_data(request: SaveDataRequest):
    """user_db.json에 데이터를 저장"""
    db_path = r"d:\hrvdata\service\user_db.json"
    try:
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(request.data, f, ensure_ascii=False, indent=2)
        return {"status": "success"}
    except Exception as e:
        print(f"Error saving data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
