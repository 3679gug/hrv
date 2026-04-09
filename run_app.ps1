# 13-Step HRV Depression Screening Solution - Unified Start Script

# 1. Start Backend (FastAPI) in a new window
echo "Starting Backend Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py"

# 2. Start Frontend (Next.js) in the current window
echo "Starting Frontend Server..."
cd frontend
npm run dev
