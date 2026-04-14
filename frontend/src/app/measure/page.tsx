'use client';

import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MoreVertical, Heart, Activity, User, UserRound, Zap, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';
import axios from 'axios';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function MeasurePage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const isTerminatedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const rgbDataRef = useRef<number[][]>([]);

  const [gender, setGender] = useState<number>(0); // 0: male, 1: female
  const [age, setAge] = useState<number>(70);

  useEffect(() => {
    const rawProfile = localStorage.getItem('user_profile');
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        if (parsed.gender !== undefined) setGender(parsed.gender);
        if (parsed.age !== undefined) setAge(parsed.age);
      } catch(e) {}
    }
  }, []);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("AI 모델 로드 중...");
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamKey, setWebcamKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Constants
  // Force rebuild for environment variable sync: 2026-04-10
  const TARGET_FRAMES = 900; // 30 seconds at 30fps
  // BACKEND_URL을 직접 지정하여 환경 변수 누락 및 포트 점유로 인한 404 방지
  const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8002";
  const API_URL = `${BACKEND_BASE}/analyze`;
  const ROI_FOREHEAD = [10, 338, 297, 332, 284, 251, 67, 109];
  const ROI_CHEEKS = [118, 119, 100, 120, 121, 116, 117, 347, 348, 329, 349, 350, 345, 346];

  // Suppress "INFO" logs that MediaPipe sends to console.error
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && (args[0].includes('XNNPACK') || args[0].includes('TFLite'))) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => { console.error = originalError; };
  }, []);

  const handleUserMedia = () => {
    setCameraError(null);
    setStatus("카메라 연결 성공. 얼굴을 맞춰주세요.");
    setIsCameraReady(true);
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error("[HRV] Camera Error:", error);
    setCameraError("카메라를 찾을 수 없거나 권한이 없습니다.");
    setStatus("카메라 연결 실패");
  };

  const retryCamera = () => {
    setWebcamKey(prev => prev + 1);
    setIsCameraReady(false);
    setCameraError(null);
    setStatus("카메라 다시 연결 중...");
  };

  // Initialize Face Landmarker
  useEffect(() => {
    if (!isCameraReady) return;

    let lastVideoTime = -1;
    isTerminatedRef.current = false;
    rgbDataRef.current = [];
    setProgress(0);

    const initAndLoop = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        const loop = () => {
          if (isTerminatedRef.current) return;
          if (webcamRef.current && webcamRef.current.video) {
            const video = webcamRef.current.video;
            // Only process if video is actually playing/streaming
            if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
              lastVideoTime = video.currentTime;
              captureFrame(video);
            }
          }
          requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("[HRV] Initialization failed", err);
        setStatus("AI 모델 로드 실패");
      }
    };

    initAndLoop();

    return () => {
      isTerminatedRef.current = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [webcamKey, isCameraReady]);

  const captureFrame = async (video: HTMLVideoElement) => {
    if (!faceLandmarkerRef.current || !canvasRef.current || isTerminatedRef.current) return;

    try {
      const timestamp = video.currentTime * 1000;
      const result = faceLandmarkerRef.current.detectForVideo(video, timestamp);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        
        // --- POSITION VALIDATION ---
        // Get bounding box of the face to ensure it's centered
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        landmarks.forEach(lm => {
          minX = Math.min(minX, lm.x);
          maxX = Math.max(maxX, lm.x);
          minY = Math.min(minY, lm.y);
          maxY = Math.max(maxY, lm.y);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const faceWidth = maxX - minX;

        // Loose criteria: Center check + Size check (increased tolerance for wider usability)
        const isCentered = centerX > 0.1 && centerX < 0.9 && centerY > 0.1 && centerY < 0.9;
        const isSizeOk = faceWidth > 0.10; // Allow farther distances

        if (isCentered && isSizeOk) {
          setIsFaceValid(true);
          if (status.includes("얼굴") || status.includes("가까이")) {
            setStatus("측정 중... 움직이지 마세요");
          }

          const allRoiIndices = [...ROI_FOREHEAD, ...ROI_CHEEKS];
          let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          allRoiIndices.forEach(idx => {
            const lm = landmarks[idx];
            const px = Math.floor(lm.x * canvas.width);
            const py = Math.floor(lm.y * canvas.height);

            if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
              const base = (py * canvas.width + px) * 4;
              rTotal += imgData[base];
              gTotal += imgData[base + 1];
              bTotal += imgData[base + 2];
              count++;
            }
          });

          if (count > 0) {
            const means = [rTotal / count, gTotal / count, bTotal / count];
            rgbDataRef.current.push(means);

            const currentProgress = Math.min((rgbDataRef.current.length / TARGET_FRAMES) * 100, 100);
            setProgress(currentProgress);

            if (rgbDataRef.current.length >= TARGET_FRAMES) {
              isTerminatedRef.current = true;
              if (requestRef.current) cancelAnimationFrame(requestRef.current);
              finishMeasurement(rgbDataRef.current);
            }
          }
        } else {
          setIsFaceValid(false);
          if (!isSizeOk) {
            setStatus("카메라에 조금 더 가까이 와주세요");
          } else {
            setStatus("얼굴을 프레임 중앙 쯤으로 맞춰주세요");
          }
        }
      } else {
        setIsFaceValid(false);
        setStatus("얼굴을 찾을 수 없습니다");
      }
    } catch (err) {
      console.warn("[HRV] Detector warning:", err);
    }
  };

  const finishMeasurement = async (data: number[][]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    setIsAnalyzing(true);
    setStatus("AI 분석 중...");
    const flowType = localStorage.getItem('flow_type') || '3';
    
    try {
      // Safety: Copy and slice to exactly 900 frames
      const payload = [...data].slice(0, TARGET_FRAMES);

      const response = await axios.post(API_URL, { 
        rgb_means: payload,
        gender: gender,
        age: age
      }, { timeout: 30000 }); // Max safety timeout
      
      localStorage.setItem('hrv_result', JSON.stringify(response.data));
      
      // Step: Check 4-week survey eligibility (TEMPORARILY DISABLED for testing)
      // const lastSurvey = localStorage.getItem('last_survey_date');
      // const now = Date.now();
      // const fourWeeksInMs = 28 * 24 * 60 * 60 * 1000;
      // const isEligible = !lastSurvey || (now - parseInt(lastSurvey)) > fourWeeksInMs;
      const isEligible = true; // Always show survey for now

      if (flowType !== '2') {
        localStorage.setItem('phq9_score', Math.round(response.data.phq9).toString());
      }
      
      setIsAnalyzing(false); 
      isProcessingRef.current = false;

      if (isEligible) {
        router.push('/voice-setup');
      } else {
        // Show message and skip survey
        alert("최근 설문을 완료하셨으므로, 오늘은 생체 신호 분석 결과만 보여드립니다. (설문 주기는 4주입니다)");
        router.push('/results?skip_survey=true');
      }
    } catch (error: any) {
      console.error("[HRV] API Error:", error.message);
      const errorMsg = error.response?.data?.detail || "분석 오류. 다시 시도해 주세요.";
      setStatus(errorMsg);
      setIsAnalyzing(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key="measure"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Header */}
          <header className="p-6 flex justify-between items-center text-gray-900 absolute top-0 left-0 right-0 z-50">
            <button onClick={() => router.back()} className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all outline-none">
              <ChevronLeft size={26} className="text-white" strokeWidth={3} />
            </button>
            <div className="w-14 h-14" />
          </header>

            <div className="flex-1 px-8 py-4 flex flex-col items-center">
              <div className="text-center mb-10 space-y-3">
                <h2 className="text-4xl font-black text-gray-900 leading-tight">당신의 마음은 <br /> 어떤가요?</h2>
              </div>

              {/* Video Frame */}
              <div className="relative w-full aspect-[4/5] rounded-[60px] overflow-hidden bg-gray-900 shadow-premium border-4 border-white">
                <Webcam
                  key={webcamKey}
                  ref={webcamRef}
                  audio={false}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover scale-x-[-1]"
                  videoConstraints={{ facingMode: "user" }}
                />

                {/* Camera Error / Retry Overlay */}
                {cameraError && !isAnalyzing && (
                  <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-6 z-20">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mb-2">
                       <Zap size={32} className="text-red-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-white font-black text-xl">카메라를 인식할 수 없어요</p>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        권한이 거부되었거나 다른 앱이 <br />
                        카메라를 사용 중일 수 있습니다.
                      </p>
                    </div>
                    <button 
                      onClick={retryCamera}
                      className="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                    >
                      카메라 다시 불러오기
                    </button>
                  </div>
                )}
                
                {/* Analyzing Overlay */}
                <AnimatePresence>
                  {isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-gray-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center space-y-8 z-30"
                    >
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BrainCircuit size={32} className="text-primary animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-2xl font-black text-white">AI 정밀 분석 중</h3>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                          수집된 900프레임의 생체 신호를 백엔드 엔진으로 전송하여 처리하고 있습니다...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className={`w-[85%] h-[80%] border-2 rounded-[50px] relative transition-all duration-300 ${isFaceValid ? 'border-primary/30' : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
                    <div className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-3xl transition-colors ${isFaceValid ? 'border-primary' : 'border-red-500'}`} />
                    <div className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-3xl transition-colors ${isFaceValid ? 'border-primary' : 'border-red-500'}`} />
                    <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-3xl transition-colors ${isFaceValid ? 'border-primary' : 'border-red-500'}`} />
                    <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-3xl transition-colors ${isFaceValid ? 'border-primary' : 'border-red-500'}`} />
                    
                    {!isFaceValid && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 bg-red-500 rounded-[48px]"
                      />
                    )}
                  </div>
                </div>

                <div className="absolute top-8 left-0 right-0 flex justify-center">
                  <div className={`backdrop-blur-md px-6 py-2 rounded-full border text-sm font-black shadow-lg transition-all ${isFaceValid ? 'bg-white/40 border-white/60 text-gray-900' : 'bg-red-500 border-red-400 text-white animate-bounce'}`}>
                    {status}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="w-full mt-10 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">측정 진행도</span>
                  <span className="text-primary text-lg font-black">{Math.round(progress)}%</span>
                </div>
                <Progress.Root className="bg-white rounded-full h-4 shadow-inner overflow-hidden border-2 border-white">
                  <Progress.Indicator 
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </Progress.Root>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-900 text-sm font-bold">카메라를 바라보며 밝은 곳에서 측정해 주세요.</p>
              </div>
            </div>
          </motion.div>
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );

}
