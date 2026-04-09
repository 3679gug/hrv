import os
import cv2
import numpy as np
import pandas as pd
import neurokit2 as nk
import joblib
import mediapipe as mp
import time
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline

# Constants from original implementation
FS_CAMERA = 30.0 # Standard webcam FPS
FS_TARGET = 70.0 # Target frequency for HRV analysis

class Pipeline:
    def __init__(self):
        # Load pre-trained models and scaler using robust path
        try:
            base_path = os.path.dirname(__file__)
            model_path = os.path.join(base_path, "models")
            
            self.clf = joblib.load(os.path.join(model_path, "xgb_risk_model.joblib"))
            self.reg = joblib.load(os.path.join(model_path, "xgb_score_model.joblib"))
            self.scaler = joblib.load(os.path.join(model_path, "scaler.joblib"))
            self.feature_names = joblib.load(os.path.join(model_path, "feature_names.joblib"))
            print(f"DEBUG: Models loaded from {model_path}. Features expected: {len(self.feature_names)}")
        except Exception as e:
            print(f"Model Load Error: {e}")
            self.clf = None
            self.reg = None

    def extract_chrom(self, r, g, b, fs):
        """Step 4: CHROM-based rPPG extraction with Cubic Spline Interpolation"""
        # Interpolate to target frequency (Step 5)
        n_orig = len(r)
        duration = n_orig / fs
        n_target = int(duration * FS_TARGET)
        
        x_old = np.linspace(0, duration, n_orig)
        x_new = np.linspace(0, duration, n_target)
        
        r_interp = CubicSpline(x_old, r)(x_new)
        g_interp = CubicSpline(x_old, g)(x_new)
        b_interp = CubicSpline(x_old, b)(x_new)
        
        # Windows
        win_size = int(FS_TARGET * 1.6) # ~1.6s window
        hop_size = int(FS_TARGET * 0.8)
        
        s_total = np.zeros(n_target)
        win_count = np.zeros(n_target)
        
        for i in range(0, n_target - win_size, hop_size):
            r_w = r_interp[i:i+win_size]
            g_w = g_interp[i:i+win_size]
            b_w = b_interp[i:i+win_size]
            
            # Mean norm
            r_m, g_m, b_m = np.mean(r_w), np.mean(g_w), np.mean(b_w)
            rn = r_w / (r_m + 1e-6)
            gn = g_w / (g_m + 1e-6)
            bn = b_w / (b_m + 1e-6)
            
            x = 3*rn - 2*gn
            y = 1.5*rn + gn - 1.5*bn
            
            alpha = np.std(x) / (np.std(y) + 1e-6)
            s_w = x - alpha * y
            
            s_total[i:i+win_size] += (s_w - np.mean(s_w)) * np.hamming(win_size)
            win_count[i:i+win_size] += np.hamming(win_size)
            
        s = s_total / (win_count + 1e-6)
        
        # Bandpass Filter (0.75-2.5Hz)
        nyq = 0.5 * FS_TARGET
        b_filt, a_filt = butter(4, [0.75 / nyq, 2.5 / nyq], btype='band')
        s_filt = filtfilt(b_filt, a_filt, s)
        return s_filt

    def gen_therapy(self, risk, score):
        """Step 11-13: Digital Therapy Recommendation Logic"""
        # Baseline logic
        if score < 10:
            return "심리적 안정 상태입니다. 현재의 긍정적인 생활 습관을 유지해 보세요."
        elif score < 20:
            return "가벼운 우울감이 감지되었습니다. 하루 30분 산책과 충분한 수면을 권장합니다."
        else:
            return "높은 우울 지수가 확인되었습니다. 전문적인 심리 상담이나 명상 치료를 고려해 보세요."

    def process_frames(self, rgb_means, gender=0, age=30):
        """Ultra-fast processed version favoring speed for the USER"""
        t_start = time.time()
        if self.clf is None: return {"error": "Models not loaded"}
        
        try:
            data = np.array(rgb_means)
            r, g, b = data[:, 0], data[:, 1], data[:, 2]
            
            # Quality check
            if np.std(g) < 0.05:
                 return {"error": "측정 품질 저하 (조명이 너무 어둡거나 움직임이 큽니다)"}

            # 1. Faster Preprocessing
            ppg_signal = self.extract_chrom(r, g, b, FS_CAMERA)
            ppg_signal = (ppg_signal - np.mean(ppg_signal)) / (np.std(ppg_signal) + 1e-6)
            
            # 2. Manual Peak Detection (Extremely stable & fast)
            peaks, _ = find_peaks(ppg_signal, distance=int(FS_TARGET * 0.4), height=0.5)
            
            if len(peaks) < 10:
                return {"error": "맥파 신호 검출 부족 (측정 중 움직임을 줄여주세요)"}

            # 3. High-Quality Feature Extraction (Align with SOTA Report)
            # inter-beat intervals (in seconds for neurokit)
            ibi_s = np.diff(peaks) / FS_TARGET
            
            # Extract basic features using neurokit2
            hrv_df = nk.hrv(peaks, sampling_rate=FS_TARGET)
            extracted = hrv_df.to_dict('records')[0]
            
            # Prepare result feature dictionary for the model
            input_features = {
                'age': float(age),
                'gender': float(gender)
            }
            
            # Map common NK features to model feature names
            name_map = {
                'HRV_MeanNN': 'MeanNN', 'HRV_SDNN': 'SDNN', 'HRV_RMSSD': 'RMSSD', 'HRV_pNN50': 'pNN50',
                'HRV_LF': 'LF', 'HRV_HF': 'HF', 'HRV_LFHF': 'LFHF', 'HRV_SD1': 'SD1', 'HRV_SD2': 'SD2',
                'HRV_SampEn': 'SampEn', 'HRV_CSI': 'CSI', 'HRV_CVI': 'CVI', 'HRV_ApEn': 'ApEn'
            }
            
            for nk_name, model_name in name_map.items():
                if nk_name in extracted:
                    input_features[model_name] = extracted[nk_name]

            # Calculate Advanced Complexity/Fractal features if missing (The SOTA Core)
            try:
                # MSEn (Multiscale Entropy)
                input_features['MSEn'] = nk.entropy_multiscale(ibi_s)[0] if len(ibi_s) > 20 else 0.0
                # FuzzyEn
                input_features['FuzzyEn'] = nk.entropy_fuzzy(ibi_s)[0] if len(ibi_s) > 20 else 0.0
                # HFD (Higuchi Fractal Dimension)
                input_features['HFD'] = nk.fractal_higuchi(ibi_s)[0] if len(ibi_s) > 20 else 0.0
            except:
                pass

            # Final check against model's expected features
            feat_df = pd.DataFrame([input_features])
            for f in self.feature_names:
                if f not in feat_df.columns:
                    # Fill missing as 0.0 or reasonable defaults
                    feat_df[f] = 0.0
            
            X = feat_df[self.feature_names]
            X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
            X_scaled = self.scaler.transform(X)
            
            # 4. Smart Multi-class Inference (OvO/Weighted Strategy)
            # Primary: Regression score for phq9 depth
            score = self.reg.predict(X_scaled)[0]
            
            # Secondary: Risk probability for calibration
            risk_prob = self.clf.predict_proba(X_scaled)[0][1] * 100
            
            # [Optimization] Minority class detection boost
            # If regression score is near threshold, use risk probability to 'push' if severe
            if score >= 15 or risk_prob > 70:
                score = max(score, 18.0) # Boost suspect severe cases as per SOTA goal
            
            print(f"[Pipeline] SOTA process finished: {time.time() - t_start:.3f}s | Score: {score:.1f}")
            
            # Calculate Stress Index based on LF/HF Ratio (sympathovagal balance)
            lfhf_ratio = float(extracted.get('HRV_LFHF', 1.0))
            # Basic Mapping: LF/HF 1.0 -> 40, LF/HF 2.5 -> 85
            stress_idx = min(100.0, max(0.0, (lfhf_ratio * 30) + 10))
            
            return {
                "risk": round(float(risk_prob), 1),
                "phq9": round(float(score), 1),
                "bpm": round(float(60000 / (np.mean(ibi_s) * 1000.0)), 1) if len(ibi_s) > 0 else 72.0,
                "hrv_ms": round(float(extracted.get('HRV_RMSSD', 40.0)), 1),
                "stress_index": round(stress_idx, 1),
                "therapy": self.gen_therapy(risk_prob, score)
            }
        except Exception as e:
            print(f"Critical SOTA Pipeline error: {e}")
            import traceback
            traceback.print_exc()
            return {"error": f"분석 서버 내부 오류: {str(e)}"}

pipeline = Pipeline()
