# HRV-Based Depression Screening & Digital Therapy App

심박변이도(HRV)와 PHQ-9 설문을 결합하여 우울증 위험도를 스크리닝하고, 맞춤형 디지털 치료(명상, 산책 등)를 제공하는 웹 애플리케이션입니다.

## 📂 프로젝트 구조

- **/frontend**: Next.js 기반의 사용자 인터페이스 (웹캠 측정, 리포트, 치료 활동 로그)
- **/backend**: FastAPI 기반의 생체 신호 분석 엔진 (Face Landmarker, HRV/BPM 산출)

## 🚀 시작하기

### 1. 백엔드 설정 (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*`.env` 파일에 `OPENAI_API_KEY` 환경 변수가 설정되어 있어야 AI 피드백 기능이 활성화됩니다.*

### 2. 프론트엔드 설정 (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## 🛠 주요 기술 스택
- **Frontend**: Next.js, Framer Motion, TailwindCSS, Lucide Icons
- **Backend**: FastAPI, Neurokit2, Mediapipe, XGBoost, Scipy, OpenCV
- **AI**: OpenAI GPT-4o-mini (심리 조언 생성)

## 🏛 저작권 및 배포
이 프로젝트는 개인 건강 관리 및 스크리닝 보조 목적으로 제작되었습니다.
배포 주소: https://github.com/3679gug/hrv
