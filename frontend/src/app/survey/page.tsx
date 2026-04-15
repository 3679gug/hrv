'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, User, CheckCircle2, ChevronRight, Activity, Mic, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';

const PHQ9_QUESTIONS = [
  "요즘 즐거웠던 일이나 좋아하시던 일에 흥미가 줄어드셨나요?",
  "기분이 자꾸 처지거나, 울적하고 앞날이 캄캄하다고 느껴지시나요?",
  "잠을 깊이 못 주무시거나 자꾸 깨시나요? 또는 너무 많이 주무시진 않나요?",
  "몸에 기운이 하나도 없고, 부쩍 피곤하다고 느껴지시나요?",
  "요즘 통 입맛이 없으신가요? 아니면 반대로 너무 많이 드시게 되나요?",
  "내가 부족하게 느껴지거나, 나 때문에 가족들이 고생하는 것 같아 마음이 아프신가요?",
  "신문이나 TV를 보실 때, 내용이 머리에 잘 들어오지 않고 집중하기 힘드신가요?",
  "남들이 눈치챌 만큼 행동이나 말이 느려지셨나요? 아니면 너무 불안해서 가만히 계시기 힘든가요?",
  "가끔 '차라리 죽는 게 낫겠다'거나 내 몸을 아프게 하고 싶다는 생각이 드실 때가 있나요?"
];

const OPTIONS = [
  { label: "아뇨, 거의 그렇지 않아요", score: 0 },
  { label: "며칠 정도 가끔 그래요", score: 1 },
  { label: "일주일 넘게 자주 그래요", score: 2 },
  { label: "네, 거의 매일 그래요", score: 3 }
];

export default function SurveyPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  useEffect(() => {
    // Load voice preference
    const savedVoice = localStorage.getItem('user_voice_preference');
    if (savedVoice) setSelectedVoice(savedVoice);
    
    // Load boolean preference for auto-voice
    const useVoice = localStorage.getItem('use_voice');
    if (useVoice === 'true') setIsVoiceEnabled(true);

    return () => stopAudio(); // Cleanup on unmount
  }, []);

  // Optimized: Cache for pre-fetched audio Blob URLs
  const blobCacheRef = useRef<Record<string, string>>({});
  const [isPreloading, setIsPreloading] = useState(false);

  // Helper to fetch and cache a single audio as a Blob URL
  const preloadAudio = async (index: number, voice: string) => {
    const cacheKey = `${index}_${voice}`;
    if (blobCacheRef.current[cacheKey]) return;

    try {
      const text = PHQ9_QUESTIONS[index];
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8002";
      const url = `${backendUrl}/tts?text=${encodeURIComponent(text)}&voice=${voice}&t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobCacheRef.current[cacheKey] = objectUrl;
        console.log(`[TTS] Preloaded question ${index + 1}`);
      }
    } catch (e: any) {
      // 배포 환경에서 백엔드 미연결 시 조용히 skip (화면 동작에는 영향 없음)
      if (e.name !== 'AbortError') {
        console.warn(`[TTS] Backend unreachable, skipping audio preload for question ${index + 1}`);
      }
    }
  };

  // Sequential pre-load of all question voices into memory to avoid server overload
  useEffect(() => {
    const preLoadAll = async () => {
      setIsPreloading(true);
      // 1. High Priority: Current question
      await preloadAudio(currentIdx, selectedVoice);
      
      // 2. Background: Preload all others sequentially
      for (let i = 0; i < PHQ9_QUESTIONS.length; i++) {
        if (i !== currentIdx) {
          await preloadAudio(i, selectedVoice);
        }
      }
      setIsPreloading(false);
    };
    preLoadAll();
  }, [selectedVoice]);

  const speakQuestion = async (text: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const cacheKey = `${currentIdx}_${selectedVoice}`;
      let audioUrl = blobCacheRef.current[cacheKey];

      if (!audioUrl) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
        audioUrl = `${backendUrl}/tts?text=${encodeURIComponent(text)}&voice=${selectedVoice}`;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') {
            console.warn("[TTS] Audio play failed", error);
          }
        });
      }
    } catch (error) {
      console.warn("[TTS] Setup failed", error);
    }
  };

  // Add Auto-play effect
  useEffect(() => {
    if (isVoiceEnabled && !isPreloading) {
       speakQuestion(PHQ9_QUESTIONS[currentIdx]);
    }
  }, [currentIdx, isVoiceEnabled, isPreloading]);

  // Flow Type state
  const [flowType, setFlowType] = useState('3');
  useEffect(() => {
    const storedFlow = localStorage.getItem('flow_type');
    if (storedFlow) setFlowType(storedFlow);
  }, []);

  const handleNext = () => {
    if (selected === null) return;

    stopAudio();

    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentIdx < PHQ9_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const totalScore = newAnswers.reduce((a, b) => a + b, 0);
      localStorage.setItem('phq9_score', totalScore.toString());
      localStorage.setItem('last_survey_date', Date.now().toString());
      
      router.push('/results');
    }
  };

  const progress = ((currentIdx + 1) / PHQ9_QUESTIONS.length) * 100;

  return (
    <main className="h-screen bg-white text-gray-900 max-w-md mx-auto flex flex-col p-2 font-sans overflow-hidden">
      <header className="flex justify-between items-center py-2 px-3 sticky top-0 bg-white z-20 border-b border-gray-50">
        <button onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 bg-transparent active:scale-95 transition-all outline-none">
          <ChevronLeft size={24} className="text-gray-900" strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">설문</h1>
        <button 
           onClick={() => {
             const newState = !isVoiceEnabled;
             setIsVoiceEnabled(newState);
             if (!newState) stopAudio();
           }}
           className={`p-2 rounded-full transition-all duration-300 ${isVoiceEnabled ? 'bg-yellow-200 text-gray-900 scale-105' : 'bg-gray-100 text-gray-400'}`}
        >
          {isVoiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </header>

      <div className="px-3 mt-2 mb-2">
        <div className="p-1 bg-gray-50/50 rounded-full">
          <Progress.Root className="relative overflow-hidden bg-white rounded-full w-full h-3 border-2 border-white shadow-sm">
            <Progress.Indicator
              className="bg-yellow-200 w-full h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </Progress.Root>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 overflow-y-auto pb-2 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-shrink-0 p-6 flex flex-col items-center justify-center text-center mb-4 bg-yellow-50 rounded-[40px] shadow-sm border-[2px] border-yellow-100 min-h-[30vh] relative overflow-hidden"
          >
            <span className="absolute top-6 left-6 bg-gray-900/10 text-gray-900 px-4 py-1 rounded-full text-xs font-black">
              Q{currentIdx + 1}
            </span>
            <h3 className="text-2xl font-black leading-[1.2] text-gray-900 break-keep">
              {PHQ9_QUESTIONS[currentIdx]}
            </h3>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-3">
          {OPTIONS.map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(opt.score)}
              className={`w-full p-5 text-left rounded-[28px] border-2 transition-all flex items-center gap-4 group shadow-sm ${selected === opt.score
                  ? 'bg-yellow-100 border-yellow-200'
                  : 'bg-white border-gray-100'
                }`}
            >
              <div className="flex-1">
                <span className={`text-base font-bold leading-tight block text-gray-900`}>
                  {opt.label}
                </span>
              </div>

              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selected === opt.score
                  ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                  : 'bg-gray-50 border-gray-100'
                }`}>
                {selected === opt.score && <CheckCircle2 size={24} />}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <footer className="mt-2 pb-6 px-3">
        <button
          onClick={handleNext}
          disabled={selected === null}
          className={`w-full py-5 flex items-center justify-center gap-3 rounded-[28px] text-xl font-black transition-all active:scale-95 ${
            selected !== null 
              ? 'bg-yellow-200 text-gray-900 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>{currentIdx < 8 ? '다음 질문' : (flowType === '2' ? '측정 시작' : '결과 보기')}</span>
          <ChevronRight size={24} />
        </button>
      </footer>
    </main>
  );
}
