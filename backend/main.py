from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import pipeline
import os
import io
from dotenv import load_dotenv
from openai import OpenAI

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

class AnalyzeRequest(BaseModel):
    rgb_means: List[List[float]]
    gender: int = 0 # 0: male, 1: female
    age: int = 30

@app.get("/")
def read_root():
    return {"status": "Healthy", "message": "HRV Depression API is online"}

@app.post("/analyze")
def analyze(data: AnalyzeRequest):
    """Step 4-13: Process a window of signals and return heart diagnosis results"""
    if len(data.rgb_means) < 900: # 30 seconds at 30 FPS
        raise HTTPException(status_code=400, detail="Insufficient data. Need at least 900 frames (30 seconds).")
    
    result = pipeline.pipeline.process_frames(data.rgb_means, data.gender, data.age)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

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
    uvicorn.run(app, host="0.0.0.0", port=8001)
