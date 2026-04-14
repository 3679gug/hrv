'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, UserRound, User, Sparkles, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [useVoice, setUseVoice] = useState<boolean | null>(null);
  const [voice, setVoice] = useState<string>('nova');

  // Audio Pre-loading for zero-lag
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const PREVIEW_TEXT = "안녕하세요. 당신의 마음 건강 가이드입니다.";

  useEffect(() => {
    // Pre-create audio objects when step 2 is reached
    if (step === 2) {
      ['nova', 'onyx'].forEach(v => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
        const url = `${backendUrl}/tts?text=${encodeURIComponent(PREVIEW_TEXT)}&voice=${v}`;
        const audio = new Audio(url);
        audio.load(); // Force preload
        audioRefs.current[v] = audio;
      });
    }
  }, [step]);

  const playPreview = (v: string) => {
    // Stop all current audio
    Object.values(audioRefs.current).forEach(a => {
      a.pause();
      a.currentTime = 0;
    });

    // Play selected
    const audio = audioRefs.current[v];
    if (audio) {
      audio.play().catch(e => console.error("[TTS] Preview error:", e));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (useVoice === true) {
        setStep(2);
      } else {
        localStorage.setItem('use_voice', 'false');
        localStorage.setItem('user_voice_preference', 'nova');
        router.push('/survey');
      }
    } else {
      localStorage.setItem('use_voice', 'true');
      localStorage.setItem('user_voice_preference', voice);
      router.push('/survey');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden p-6 font-sans">
      <header className="flex justify-between items-center mb-8 relative z-10 pt-4">
        <button onClick={() => router.back()} className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all">
          <ChevronLeft size={26} className="text-white" strokeWidth={3} />
        </button>
        <div className="flex flex-col items-center">
        </div>
        <div className="w-12" />
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="text-center space-y-4 mb-12">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-snug">
                지금부터 마음 건강을 <br /> 확인하겠습니다.
              </h1>
              <p className="text-gray-500 font-bold">음성 지원이 필요하십니까?</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => setUseVoice(true)}
                className={`w-full p-6 rounded-[32px] border-2 transition-all flex items-center gap-4 ${useVoice === true ? 'bg-primary border-primary shadow-xl shadow-primary/20 text-white' : 'bg-white border-gray-100 text-gray-800'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${useVoice === true ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                  <Volume2 />
                </div>
                <span className="text-xl font-black">예, 필요합니다</span>
              </button>

              <button 
                onClick={() => setUseVoice(false)}
                className={`w-full p-6 rounded-[32px] border-2 transition-all flex items-center gap-4 ${useVoice === false ? 'bg-gray-900 border-gray-900 shadow-xl text-white' : 'bg-white border-gray-100 text-gray-800'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${useVoice === false ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                  <VolumeX />
                </div>
                <span className="text-xl font-black">아니오, 괜찮습니다</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="text-center space-y-4 mb-10">
              <h1 className="text-4xl font-black text-gray-900 leading-tight">
                안내 목소리를 <br /> 골라주세요
              </h1>
              <p className="text-sm text-gray-900 font-black tracking-tight opacity-60">아이콘을 누르면 미리 들어볼 수 있습니다</p>
            </div>

            <div className="grid grid-cols-2 gap-4 px-2">
              <button 
                onClick={() => {
                  setVoice('nova');
                  playPreview('nova');
                }}
                className={`p-8 rounded-[48px] border-2 transition-all flex flex-col items-center gap-6 ${voice === 'nova' ? 'border-primary bg-primary/20 shadow-xl z-10 scale-105' : 'border-gray-100 bg-white text-gray-400'}`}
              >
                <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center transition-all ${voice === 'nova' ? 'bg-primary text-gray-900 shadow-lg' : 'bg-gray-100'}`}>
                  <UserRound size={40} />
                </div>
                <div className="text-center">
                  <span className={`font-black block text-2xl ${voice === 'nova' ? 'text-gray-900' : 'text-gray-900'}`}>따뜻한 여성</span>
                  <span className="text-sm opacity-60 font-bold mt-2 block">Nova 가이드</span>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setVoice('onyx');
                  playPreview('onyx');
                }}
                className={`p-8 rounded-[48px] border-2 transition-all flex flex-col items-center gap-6 ${voice === 'onyx' ? 'border-primary bg-primary/20 shadow-xl z-10 scale-105' : 'border-gray-100 bg-white text-gray-400'}`}
              >
                <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center transition-all ${voice === 'onyx' ? 'bg-primary text-gray-900 shadow-lg' : 'bg-gray-100'}`}>
                  <User size={40} />
                </div>
                <div className="text-center">
                  <span className={`font-black block text-2xl ${voice === 'onyx' ? 'text-gray-900' : 'text-gray-900'}`}>신뢰감있는 남성</span>
                  <span className="text-sm opacity-60 font-bold mt-2 block">Onyx 가이드</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-8 pb-6">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          disabled={useVoice === null}
          className={`w-full py-6 rounded-[32px] text-xl font-black flex justify-center gap-2 transition-all ${useVoice !== null ? 'bg-primary text-white shadow-premium' : 'bg-gray-200 text-gray-400'}`}
        >
          {step === 1 ? '선택 완료' : '설문 시작하기'}
        </motion.button>
      </div>
    </main>
  );
}
