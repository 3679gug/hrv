'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Load voice preference
    const savedVoice = localStorage.getItem('user_voice_preference');
    if (savedVoice) setSelectedVoice(savedVoice);
    
    // Load boolean preference for auto-voice
    const useVoice = localStorage.getItem('use_voice');
    if (useVoice === 'true') setIsVoiceEnabled(true);
  }, []);

  // New: Cache for pre-fetched audio Blob URLs (Key: `${index}_${voice}`)
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [isPreloading, setIsPreloading] = useState(false);
  // Track active fetch promises to avoid race conditions
  const [fetchPromises, setFetchPromises] = useState<Record<string, Promise<string | null>>>({});

  // Helper to fetch and cache a single audio
  const fetchAudio = async (index: number, voice: string) => {
    const cacheKey = `${index}_${voice}`;
    
    // If already in cache, return it
    if (audioCache[cacheKey]) return audioCache[cacheKey];
    // If already fetching, return the existing promise
    if (fetchPromises[cacheKey] !== undefined) return fetchPromises[cacheKey];

    const promise = (async () => {
      try {
        const text = PHQ9_QUESTIONS[index];
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
        const url = `${backendUrl}/tts?text=${encodeURIComponent(text)}&voice=${voice}&t=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setAudioCache(prev => ({ ...prev, [cacheKey]: objectUrl }));
          return objectUrl;
        }
      } catch (e) {
        console.error(`[TTS] Fetch error for ${cacheKey}:`, e);
        return null;
      } finally {
        // Clear promise from tracker when done
        setFetchPromises(prev => {
          const next = { ...prev };
          delete next[cacheKey];
          return next;
        });
      }
      return null;
    })();

    setFetchPromises(prev => ({ ...prev, [cacheKey]: promise }));
    return promise;
  };

  // Pre-load all question voices into memory
  useEffect(() => {
    const preLoadVoices = async () => {
      setIsPreloading(true);
      console.log(`[TTS] Optimizing for [${selectedVoice}] voice...`);

      try {
        // 1. High Priority: Fetch the CURRENT question first
        await fetchAudio(currentIdx, selectedVoice);
        console.log(`[TTS] Priority question ${currentIdx + 1} ready.`);

        // 2. Background: Fetch the remaining questions
        PHQ9_QUESTIONS.forEach((_, index) => {
          const cacheKey = `${index}_${selectedVoice}`;
          if (index !== currentIdx && !audioCache[cacheKey]) {
            fetchAudio(index, selectedVoice);
          }
        });
      } catch (error) {
        console.error("[TTS] System error:", error);
      } finally {
        setIsPreloading(false);
      }
    };

    preLoadVoices();
  }, [selectedVoice, currentIdx]);

  const speakQuestion = async (text: string) => {
    try {
      // Step 1: Check if audio is already in cache (Voice-aware)
      const cacheKey = `${currentIdx}_${selectedVoice}`;
      let audioUrl = audioCache[cacheKey];

      // Step 1.5: If not in cache but a fetch is in progress, WAIT for it (0.1s ~ 0.5s)
      if (!audioUrl && fetchPromises[cacheKey] !== undefined) {
        console.log(`[TTS] Waiting for pending fetch for question ${currentIdx + 1}...`);
        audioUrl = (await fetchPromises[cacheKey]) || '';
      }

      if (audioUrl) {
        console.log(`[TTS] Fast play: ${selectedVoice}`);
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      }

      // Step 2: Fallback with cache busting (only if everything else fails)
      console.log(`[TTS] Emergency fallback stream for ${currentIdx}`);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
      const fallbackUrl = `${backendUrl}/tts?text=${encodeURIComponent(text)}&voice=${selectedVoice}&t=${Date.now()}`;
      const audio = new Audio(fallbackUrl);
      await audio.play();
    } catch (error) {
      console.warn("[TTS] Premium failed, fallback browser", error);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ko-KR';
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
  };

  // Add Auto-play effect
  useEffect(() => {
    if (isVoiceEnabled && !isPreloading) {
       // A small delay helps if transitioning
       const timeout = setTimeout(() => {
         speakQuestion(PHQ9_QUESTIONS[currentIdx]);
       }, 300);
       return () => clearTimeout(timeout);
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

    // Stop speech if it's ongoing
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

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
    <main className="min-h-screen bg-white text-gray-900 max-w-md mx-auto flex flex-col p-6 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 mb-1">Step 2. Mind Survey</span>
          <h1 className="text-sm font-black text-gray-900">마음 건강 설문</h1>
        </div>
        <button 
           onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
           className={`p-3 rounded-2xl transition-colors ${isVoiceEnabled ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'}`}
        >
          {isVoiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </header>


      {/* Progress Bar */}
      <div className="mb-10 p-6 bg-gray-50 rounded-[32px]">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-4xl font-black text-primary">{currentIdx + 1}</span>
            <span className="text-xl font-bold text-gray-300 ml-1">/ 9</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">우울 지수 평가</span>
        </div>
        <Progress.Root className="relative overflow-hidden bg-white rounded-full w-full h-3 border border-gray-100/50">
          <Progress.Indicator
            className="bg-primary w-full h-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      </div>

      {/* Question Card */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-8 min-h-[220px] flex flex-col items-center justify-center text-center mb-8 relative border-none shadow-none bg-primary/5 rounded-[40px]"
          >
            <button
              onClick={() => speakQuestion(PHQ9_QUESTIONS[currentIdx])}
              className="absolute top-4 right-4 px-3 py-2 rounded-2xl bg-white shadow-lg flex items-center gap-2 text-primary active:scale-95 hover:bg-gray-50 transition-all border border-gray-100 group"
            >
              <Mic className="group-hover:animate-bounce" size={16} />
              <span className="text-[10px] font-black uppercase tracking-tighter">질문 듣기</span>
            </button>
            <h3 className="text-2xl font-black leading-[1.6] text-gray-800 break-keep">
              {PHQ9_QUESTIONS[currentIdx]}
            </h3>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="space-y-4">
          {OPTIONS.map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(opt.score)}
              className={`w-full p-5 text-left rounded-[32px] border-2 transition-all flex items-center gap-4 group ${selected === opt.score
                  ? 'bg-primary border-primary shadow-xl shadow-primary/20'
                  : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
            >
              <div className="flex-1">
                <span className={`text-xl font-black leading-tight block ${selected === opt.score ? 'text-white' : 'text-gray-800'}`}>
                  {opt.label}
                </span>
              </div>

              {/* Check Indicator */}
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selected === opt.score
                  ? 'bg-white/20 border-white/40'
                  : 'bg-gray-50 border-gray-100 group-hover:border-gray-200'
                }`}>
                {selected === opt.score && <CheckCircle2 size={16} className="text-white" />}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="mt-8">
        <button
          onClick={handleNext}
          disabled={selected === null}
          className={`w-full py-6 rounded-[32px] font-black text-xl flex items-center justify-center gap-3 transition-all ${selected !== null
              ? 'bg-gray-900 text-white shadow-2xl shadow-gray-200'
              : 'bg-gray-100 text-gray-300'
            }`}
        >
          <span>{currentIdx < 8 ? '다음 질문' : (flowType === '2' ? '생체 신호 측정하기' : '결과 리포트 확인')}</span>
          <ChevronRight size={24} />
        </button>
        <p className="text-[10px] text-center text-gray-400 font-bold mt-6 tracking-widest uppercase opacity-60">
          PHQ-9 Clinical Standard Assessment
        </p>
      </footer>
    </main>
  );
}
