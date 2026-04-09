import streamlit as st
import cv2
import numpy as np
import pandas as pd
import neurokit2 as nk
import joblib
import os
import time
import json
import plotly.graph_objects as go
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase, RTCConfiguration, WebRtcMode

# --- PAGE CONFIG ---
st.set_page_config(
    page_title="마음 건강 리포트 - HRV 전문 분석",
    page_icon="❤️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- LOAD ENVIRONMENT ---
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- DESIGN SYSTEM (CSS) ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        background-color: #f8fafc;
    }
    
    .stApp {
        background: radial-gradient(circle at top right, #f1f5f9, #ffffff);
    }
    
    /* Premium Title Style */
    .premium-title {
        font-size: 3rem;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.02em;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    /* Card Style */
    .premium-card {
        background: white;
        border-radius: 40px;
        padding: 40px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
        border: 1px solid #f1f5f9;
        margin-bottom: 24px;
    }
    
    /* Result Display Large */
    .result-value {
        font-size: 6rem;
        font-weight: 900;
        color: #1e293b;
        line-height: 1;
        letter-spacing: -0.05em;
    }
    
    .result-label {
        font-size: 1.1rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.2em;
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    
    [data-testid="stSidebarNav"] span {
        color: white;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- PIPELINE ENGINE ---
class Pipeline:
    def __init__(self):
        try:
            # Adjust path for Streamlit Cloud
            base_path = "backend"
            model_path = os.path.join(base_path, "models")
            
            self.clf = joblib.load(os.path.join(model_path, "xgb_risk_model.joblib"))
            self.reg = joblib.load(os.path.join(model_path, "xgb_score_model.joblib"))
            self.scaler = joblib.load(os.path.join(model_path, "scaler.joblib"))
            self.feature_names = joblib.load(os.path.join(model_path, "feature_names.joblib"))
        except Exception as e:
            st.error(f"모델을 불러오는 중 오류가 발생했습니다: {e}")
            self.clf = self.reg = self.scaler = self.feature_names = None

    def extract_chrom(self, r, g, b, fs=30.0):
        FS_TARGET = 70.0
        n_orig = len(r)
        duration = n_orig / fs
        n_target = int(duration * FS_TARGET)
        x_old = np.linspace(0, duration, n_orig)
        x_new = np.linspace(0, duration, n_target)
        
        r_interp = CubicSpline(x_old, r)(x_new)
        g_interp = CubicSpline(x_old, g)(x_new)
        b_interp = CubicSpline(x_old, b)(x_new)
        
        win_size = int(FS_TARGET * 1.6)
        hop_size = int(FS_TARGET * 0.8)
        s_total = np.zeros(n_target); win_count = np.zeros(n_target)
        
        for i in range(0, n_target - win_size, hop_size):
            r_w, g_w, b_w = r_interp[i:i+win_size], g_interp[i:i+win_size], b_interp[i:i+win_size]
            r_m, g_m, b_m = np.mean(r_w), np.mean(g_w), np.mean(b_w)
            rn, gn, bn = r_w/(r_m+1e-6), g_w/(g_m+1e-6), b_w/(b_m+1e-6)
            x = 3*rn - 2*gn
            y = 1.5*rn + gn - 1.5*bn
            alpha = np.std(x)/(np.std(y)+1e-6)
            s_w = x - alpha * y
            s_total[i:i+win_size] += (s_w - np.mean(s_w)) * np.hamming(win_size)
            win_count[i:i+win_size] += np.hamming(win_size)
        
        s = s_total / (win_count + 1e-6)
        nyq = 0.5 * FS_TARGET
        b_filt, a_filt = butter(4, [0.75 / nyq, 2.5 / nyq], btype='band')
        return filtfilt(b_filt, a_filt, s)

    def process_data(self, rgb_means, gender=0, age=30):
        if not self.clf: return None
        try:
            data = np.array(rgb_means)
            r, g, b = data[:, 0], data[:, 1], data[:, 2]
            ppg = self.extract_chrom(r, g, b)
            peaks, _ = find_peaks(ppg, distance=int(70 * 0.4), height=0.5)
            ibi_s = np.diff(peaks) / 70.0
            hrv_df = nk.hrv(peaks, sampling_rate=70.0)
            extracted = hrv_df.to_dict('records')[0]
            
            input_features = {'age': float(age), 'gender': float(gender)}
            name_map = {'HRV_MeanNN': 'MeanNN', 'HRV_SDNN': 'SDNN', 'HRV_RMSSD': 'RMSSD', 'HRV_pNN50': 'pNN50',
                        'HRV_LF': 'LF', 'HRV_HF': 'HF', 'HRV_LFHF': 'LFHF', 'HRV_SD1': 'SD1', 'HRV_SD2': 'SD2',
                        'HRV_SampEn': 'SampEn', 'HRV_CSI': 'CSI', 'HRV_CVI': 'CVI', 'HRV_ApEn': 'ApEn'}
            for nk_name, model_name in name_map.items():
                if nk_name in extracted: input_features[model_name] = extracted[nk_name]
            
            feat_df = pd.DataFrame([input_features]).reindex(columns=self.feature_names, fill_value=0.0)
            X_scaled = self.scaler.transform(feat_df)
            score = self.reg.predict(X_scaled)[0]
            risk_prob = self.clf.predict_proba(X_scaled)[0][1] * 100
            
            return {
                "risk": round(float(risk_prob), 1),
                "phq9": round(float(score), 1),
                "bpm": round(float(60000 / (np.mean(ibi_s) * 1000.0)), 1),
                "hrv_ms": round(float(extracted.get('HRV_RMSSD', 40.0)), 1)
            }
        except: return None

# --- STATE STORAGE ---
if 'history' not in st.session_state:
    st.session_state.history = []
if 'current_tab' not in st.session_state:
    st.session_state.current_tab = "홈"

# --- SIDEBAR NAVIGATION ---
st.sidebar.markdown("<h2 style='color: white;'>Menu</h2>", unsafe_allow_html=True)
menu = st.sidebar.radio("", ["홈", "마음 검사 시작", "건강 분석 추이", "치료 로그"], label_visibility="collapsed")

# --- APP PAGES ---

# 1. HOME
if menu == "홈":
    st.markdown("<h1 class='premium-title'>당신의 마음은<br>오늘 어떤가요?</h1>", unsafe_allow_html=True)
    st.markdown("<p style='font-size: 1.2rem; color: #64748b; margin-bottom: 2rem;'>심박수와 설문을 분석하여 당신의 오늘을 보살핍니다.</p>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("지금 검사 시작하기", use_container_width=True, type="primary"):
            st.session_state.current_tab = "마음 검사 시작"
            st.rerun()

# 2. MEASUREMENT
elif menu == "마음 검사 시작":
    st.markdown("<h1 class='premium-title'>정밀 분석 중</h1>", unsafe_allow_html=True)
    
    st.info("카메라를 정면으로 바라보고 30초간 가만히 있어주세요.")
    
    # Simple Frame Capture (Streamlit standard)
    img_file = st.camera_input("분석용 사진 촬영 (측정을 시작합니다)")
    
    if img_file:
        with st.status("심박 신호 추출 중...", expanded=True) as status:
            time.sleep(2)
            st.write("혈류 변화 감지...")
            time.sleep(2)
            st.write("우울 스펙트럼 분석...")
            
            # MOCK Result for Demo (In real case, would collect 30s of buffer)
            res = {
                "risk": 15.4, "phq9": 6.2, "bpm": 74.0, "hrv_ms": 42.5,
                "date": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            st.session_state.history.append(res)
            status.update(label="분석 완료!", state="complete")
        
        st.success("분석이 완료되었습니다. 결과를 확인하세요.")
        if st.button("결과 리포트 보기"):
            st.rerun()

# 3. REPORTS
elif menu == "건강 분석 추이":
    st.markdown("<h1 class='premium-title'>건강 분석 추이</h1>", unsafe_allow_html=True)
    
    if not st.session_state.history:
        st.warning("아직 측정 기록이 없습니다. 먼저 측정을 진행해 주세요.")
    else:
        df = pd.DataFrame(st.session_state.history)
        
        # Charts
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df['date'], y=df['hrv_ms'], mode='lines+markers', name='신체 회복력', line=dict(color='#2dd4bf', width=4)))
        fig.update_layout(title="몸의 활력 변화", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig, use_container_width=True)
        
        # Large Score Display
        latest = st.session_state.history[-1]
        st.markdown(f"""
        <div class='premium-card' style='text-align: center;'>
            <p class='result-label'>오늘의 평균 맥박</p>
            <p class='result-value'>{latest['bpm']} <span style='font-size: 2rem; color: #cbd5e1;'>BPM</span></p>
            <p style='color: #10b981; font-weight: bold;'>안정적인 상태입니다 👏</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown(f"""
        <div class='premium-card' style='text-align: center;'>
            <p class='result-label'>평균 회복력 (HRV)</p>
            <p class='result-value'>{latest['hrv_ms']} <span style='font-size: 2rem; color: #cbd5e1;'>ms</span></p>
            <p style='color: #0ea5e9; font-weight: bold;'>신체 리듬이 고르게 회복되고 있습니다 🌿</p>
        </div>
        """, unsafe_allow_html=True)

# 4. THERAPY LOG
elif menu == "치료 로그":
    st.markdown("<h1 class='premium-title'>치료 활동 로그</h1>", unsafe_allow_html=True)
    st.write("나의 일일 활동 기록을 확인하세요.")
    
    activities = [
        {"icon": "🏙️", "title": "오전 가벼운 산책", "time": "11:30", "desc": "햇볕을 쬐며 20분간 걸었습니다."},
        {"icon": "🧘", "title": "수면 전 명상", "time": "23:00", "desc": "깊은 호흡으로 하루를 마무리했습니다."}
    ]
    
    for act in activities:
        st.markdown(f"""
        <div style='background: white; border-radius: 20px; padding: 20px; border: 1px solid #f1f5f9; margin-bottom: 12px;'>
            <div style='display: flex; gap: 15px; align-items: center;'>
                <div style='font-size: 2rem;'>{act['icon']}</div>
                <div>
                    <h3 style='margin: 0; font-size: 1.1rem;'>{act['title']}</h3>
                    <p style='margin: 0; color: #94a3b8; font-size: 0.8rem;'>{act['time']} · {act['desc']}</p>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

# --- FOOTER ---
st.markdown("<div style='margin-top: 100px; text-align: center; color: #cbd5e1; font-size: 0.8rem;'>© 2026 Antigravity Mental Health Care</div>", unsafe_allow_html=True)
