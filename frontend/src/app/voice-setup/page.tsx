'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, UserRound, User, Sparkles, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [useVoice, setUseVoice] = useState<boolean | null>(null);
  const [voice, setVoice] = useState<string>('nova');

  const handleNext = () => {
    if (step === 1) {
      if (useVoice === true) {
        setStep(2);
      } else {
        // 아니오 선택 시: 보이스 비활성화 및 기본값 저장 후 바로 설문으로 이동
        localStorage.setItem('use_voice', 'false');
        localStorage.setItem('user_voice_preference', 'nova'); // 강제 재생 시 사용할 기본 목소리
        router.push('/survey');
      }
    } else {
      // 보이스 설정 완료
      localStorage.setItem('use_voice', 'true');
      localStorage.setItem('user_voice_preference', voice);
      router.push('/survey');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden p-6 font-sans">
      <header className="flex justify-between items-center mb-8 relative z-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-primary transition-all ring-1 ring-gray-100">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Voice Setup</span>
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
              <h1 className="text-2xl font-black text-gray-900 leading-snug">
                안내 목소리를 <br /> 골라주세요
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setVoice('nova')}
                className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${voice === 'nova' ? 'border-primary bg-primary/5 shadow-soft z-10 scale-105' : 'border-gray-100 bg-white text-gray-400'}`}
              >
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${voice === 'nova' ? 'bg-primary text-white' : 'bg-gray-50'}`}>
                  <UserRound size={32} />
                </div>
                <div className="text-center">
                  <span className={`font-black block text-lg ${voice === 'nova' ? 'text-primary' : ''}`}>따뜻한 여성</span>
                  <span className="text-xs opacity-60 font-bold mt-1 block">Nova 가이드</span>
                </div>
              </button>
              
              <button 
                onClick={() => setVoice('onyx')}
                className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${voice === 'onyx' ? 'border-primary bg-primary/5 shadow-soft z-10 scale-105' : 'border-gray-100 bg-white text-gray-400'}`}
              >
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${voice === 'onyx' ? 'bg-primary text-white' : 'bg-gray-50'}`}>
                  <User size={32} />
                </div>
                <div className="text-center">
                  <span className={`font-black block text-lg ${voice === 'onyx' ? 'text-primary' : ''}`}>신뢰감있는 남성</span>
                  <span className="text-xs opacity-60 font-bold mt-1 block">Onyx 가이드</span>
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
