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
from supabase import create_client, Client
import faiss
from pathlib import Path

import numpy as np

# Patch for NeuroKit2 compatibility with older numpy versions
if not hasattr(np, 'trapezoid'):
    np.trapezoid = np.trapz

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# Supabase 초기화
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Optional[Client] = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("DEBUG: Supabase Client Initialized")
    except Exception as e:
        print(f"DEBUG: Supabase Init Error: {e}")

# RAG (Knowledge Base) 초기화
INDEX_FILE = "manual_index.faiss"
METADATA_FILE = "manual_metadata.json"
knowledge_index = None
knowledge_chunks = []

def load_knowledge_base():
    global knowledge_index, knowledge_chunks
    # 실행 위치와 D드라이브 루트 위치 모두 확인
    paths = [Path(INDEX_FILE), Path(r"D:\hrvdata") / INDEX_FILE]
    meta_paths = [Path(METADATA_FILE), Path(r"D:\hrvdata") / METADATA_FILE]
    
    target_idx = next((p for p in paths if p.exists()), None)
    target_meta = next((p for p in meta_paths if p.exists()), None)

    if target_idx and target_meta:
        try:
            knowledge_index = faiss.read_index(str(target_idx))
            with open(target_meta, 'r', encoding='utf-8') as f:
                knowledge_chunks = json.load(f)
            print(f"DEBUG: RAG Knowledge Base Loaded ({len(knowledge_chunks)} chunks)")
        except Exception as e:
            print(f"DEBUG: Knowledge Base Load Error: {e}")
    else:
        print("DEBUG: Knowledge Base files not found. Running without RAG.")

app = FastAPI(title="HRV Depression Screening API")

@app.on_event("startup")
def startup():
    load_knowledge_base()

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
    """OpenAI 및 RAG 기반 어르신 맞춤형 상담 챗봇 (시간 인지 능력 강화)"""
    try:
        user_input = data.messages[-1].content if data.messages else ""
        
        # ── 0. 현재 시간 인지 (KST 기준) ────────────────
        import datetime
        now = datetime.datetime.now()
        current_time_str = now.strftime("%Y-%m-%d %H:%M")
        current_hour = now.hour
        
        # ── 1. RAG 검색 ───────────────────────────────
        rag_context = ""
        if knowledge_index and knowledge_chunks:
            try:
                # 검색어 강화 (Expansion)
                expansion_map = {
                    "끔찍": "distress cognitive distortion catastrophizing",
                    "최악": "negative thinking depression pessimism",
                    "힘들어": "depression difficulty coping behavioral activation",
                    "무기력": "anhedonia loss of motivation behavioral withdrawal",
                    "우울": "depression behavioral activation CBT treatment",
                }
                search_query = user_input
                for k, v in expansion_map.items():
                    if k in user_input: search_query += f" {v}"

                emb_res = client.embeddings.create(input=search_query, model="text-embedding-3-small")
                query_vector = np.array([emb_res.data[0].embedding]).astype('float32')
                D, I = knowledge_index.search(query_vector, 3)
                related_docs = [knowledge_chunks[idx] for idx in I[0] if idx < len(knowledge_chunks)]
                rag_context = "\n\n".join([f"[근거]: {doc}" for doc in related_docs])
            except Exception as e:
                print(f"DEBUG: RAG Retrieval Error: {e}")

        summary = getattr(data, 'summary_context', None)
        summary_text = summary if summary else "어제 특별한 활동 기록 없음"

        system_content = (
            "당신은 행동활성화(BA)와 인지행동치료(CBT) 전문 '마음이음' 상담사입니다. "
            "사용자를 다정하게 대하며, 친구처럼 편안하면서도 전문적인 통찰을 제공하세요.\n\n"
            f"{SESSION_ARC}\n\n"
            "【핵심 상담 규칙】\n"
            "1. **공감 및 지지**: 사용자의 말에 먼저 충분히 공감해주세요.\n"
            "2. **이모지 제한**: 🌟, ✨ 등 화려한 이모지 금지. 💛, ✅, 🏃 등 차분한 이모지만 최소한 사용.\n"
            "3. **패턴 중심**: 상황 공유 시, 인지적 함정이나 패턴을 명확히 요약해주고 공감을 받으세요.\n"
            "4. **연속성 유지**: 제공된 '추가 맥락'을 참고하여 안부를 물으세요.\n"
            "5. **간결성**: 한 번의 답변은 2~3문장 이내로 하세요.\n\n"
            f"【사용자 현재 시간】\n"
            f"{current_time_str}\n\n"
            "【추가 맥락 (과거 기록)】\n"
            f"{summary_text}\n\n"
            "【치료 지식 근거 (CBT 매뉴얼)】\n"
            f"{rag_context if rag_context else '(일반 가이드라인 적용)'}\n\n"
            "【응답 형식】\n"
            "반드시 아래의 JSON 형식으로만 답변하세요:\n"
            "{\n"
            "  \"reply\": \"(상담 메시지)\",\n"
            "  \"choices\": [\n"
            "    {\"emoji\": \"...\", \"label\": \"(짧은 버튼)\", \"text\": \"(전체 문장)\"}\n"
            "  ],\n"
            "  \"activity_hour\": (방금 대화에서 언급된 활동의 발생 시간대 0~23 정수, 알 수 없으면 현재 시간인 " + str(current_hour) + " 출력)\n"
            "}\n"
            "- choices는 3~4개 생성하세요."
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
        activity_hour = res_data.get("activity_hour", current_hour) # AI가 추론한 시간
        
        mood_score = score_mood(user_input)
        
        import base64
        audio_base64 = None
        try:
            tts_res = client.audio.speech.create(model="tts-1", voice="nova", input=reply)
            audio_base64 = base64.b64encode(tts_res.content).decode("utf-8")
        except Exception as e:
            print("TTS Error:", e)
        
        return {
            "reply": reply,
            "audio_base64": audio_base64,
            "mood_score": mood_score,
            "suggested_choices": suggested_choices,
            "activity_hour": activity_hour, # 추론된 시간대 포함
            "evidence": rag_context # 검색 근거 포함
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
def get_data(user_id: str = "guest_user"):
    """JSON 파일(로컬)과 Supabase(클라우드)에서 데이터를 병합하여 로드"""
    db_path = r"d:\hrvdata\service\user_db.json"
    result = {"hrv_sessions": [], "scheduled_activities": [], "custom_activities": [], "gratitude_entries": []}
    
    # 1. 로컬 파일 우선 로드
    try:
        if os.path.exists(db_path):
            with open(db_path, "r", encoding="utf-8") as f:
                result.update(json.load(f))
    except Exception as e:
        print(f"DEBUG: Local Load Error: {e}")

    # 2. Supabase 연동 시 클라우드 데이터 우선 (더 최신일 가능성 높음)
    if supabase:
        try:
            sess = supabase.table("hrv_sessions").select("*").eq("user_id", user_id).execute()
            if sess.data: result["hrv_sessions"] = sess.data
            
            sched = supabase.table("scheduled_activities").select("*").eq("user_id", user_id).execute()
            if sched.data: result["scheduled_activities"] = sched.data
            
            print("DEBUG: Loaded data from Supabase")
        except Exception as e:
            print(f"DEBUG: Supabase Sync Error: {e}")

    return result

@app.post("/api/save_data")
def save_data(request: SaveDataRequest):
    """JSON 파일(로컬) 저장 및 Supabase 클라우드 동기화"""
    db_path = r"d:\hrvdata\service\user_db.json"
    user_id = "guest_user" # 우선 고정
    
    # 1. 로컬 파일 저장
    try:
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(request.data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"DEBUG: Local Save Error: {e}")

    # 2. Supabase 동기화
    if supabase:
        try:
            # hrv_sessions 동기화
            sessions = request.data.get("hrv_sessions", [])
            for s in sessions:
                s["user_id"] = user_id
                supabase.table("hrv_sessions").upsert(s).execute()
            
            # scheduled_activities 동기화
            scheduled = request.data.get("scheduled_activities", [])
            for s in scheduled:
                s["user_id"] = user_id
                supabase.table("scheduled_activities").upsert(s).execute()
                
            print("DEBUG: Synchronized with Supabase")
        except Exception as e:
            print(f"DEBUG: Supabase Sync Error: {e}")

    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
