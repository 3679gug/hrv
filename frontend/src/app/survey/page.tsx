'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, CheckCircle2, ChevronRight, Activity, Mic, Volume2, VolumeX } from 'lucide-react';
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
      const url = `${backendUrl}/tts?text=${encodeURIComponent(text)}&voice=${voice}&t=${Date.now()}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobCacheRef.current[cacheKey] = objectUrl;
        console.log(`[TTS] Preloaded question ${index + 1}`);
      }
    } catch (e) {
      console.error(`[TTS] Preload error for ${cacheKey}:`, e);
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
    <main className="min-h-screen bg-white text-gray-900 max-w-md mx-auto flex flex-col p-4 font-sans">
      <header className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => router.back()} className="p-5 rounded-[28px] bg-gray-50 text-gray-500 hover:text-primary transition-all shadow-md active:scale-95">
          <ArrowLeft size={36} />
        </button>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">마음 설문</h1>
        <button 
           onClick={() => {
             const newState = !isVoiceEnabled;
             setIsVoiceEnabled(newState);
             if (!newState) stopAudio();
           }}
           className={`p-5 rounded-[28px] transition-all duration-300 shadow-lg ${isVoiceEnabled ? 'bg-primary text-gray-900 scale-110 shadow-primary/30' : 'bg-gray-100 text-gray-400'}`}
        >
          {isVoiceEnabled ? <Volume2 size={36} /> : <VolumeX size={36} />}
        </button>
      </header>

      <div className="mb-6 px-2">
        <div className="p-4 bg-gray-50 rounded-[24px]">
          <Progress.Root className="relative overflow-hidden bg-white rounded-full w-full h-4 border border-gray-100/50">
            <Progress.Indicator
              className="bg-primary w-full h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </Progress.Root>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-[1.5] p-10 flex flex-col items-center justify-center text-center mb-6 bg-primary rounded-[64px] shadow-2xl border-8 border-white min-h-[40vh]"
          >
            <h3 className="text-5xl font-black leading-[1.3] text-gray-900 break-keep">
              {PHQ9_QUESTIONS[currentIdx]}
            </h3>
          </motion.div>
        </AnimatePresence>

        <div className="flex-1 space-y-4">
          {OPTIONS.map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(opt.score)}
              className={`w-full p-7 text-left rounded-[40px] border-4 transition-all flex items-center gap-6 group ${selected === opt.score
                  ? 'bg-gray-900 border-gray-900 shadow-2xl'
                  : 'bg-white border-gray-100'
                }`}
            >
              <div className="flex-1">
                <span className={`text-3xl font-black leading-tight block ${selected === opt.score ? 'text-white' : 'text-gray-900'}`}>
                  {opt.label}
                </span>
              </div>

              <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all ${selected === opt.score
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 border-gray-100'
                }`}>
                {selected === opt.score && <CheckCircle2 size={32} className="text-gray-900" />}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <footer className="mt-8 pb-4 px-2">
        <button
          onClick={handleNext}
          disabled={selected === null}
              : 'bg-gray-100 text-gray-400'
            }`}
        >
          <span>{currentIdx < 8 ? '다음 질문' : (flowType === '2' ? '생체 신호 측정하기' : '결과 리포트 확인')}</span>
          <ChevronRight size={24} />
        </button>
      </footer>
    </main>
  );
}
