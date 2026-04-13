'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [gender, setGender] = useState<number>(0); // 0: male, 1: female
  const [age, setAge] = useState<number>(70);
  const [voice, setVoice] = useState<string>('nova'); // 'nova' (female), 'onyx' (male)

  useEffect(() => {
    // Load previously saved profile if available
    const rawProfile = localStorage.getItem('user_profile');
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        if (parsed.gender !== undefined) setGender(parsed.gender);
        if (parsed.age !== undefined) setAge(parsed.age);
        if (parsed.voice !== undefined) setVoice(parsed.voice);
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('user_profile', JSON.stringify({ gender, age }));
    
    // Determine next route based on flow_type (always 3 now, but kept logic for safety)
    const flowType = localStorage.getItem('flow_type') || '3';
    router.push('/measure');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key="profile"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="flex-1 flex flex-col p-6 pb-10"
        >
          <header className="mb-8">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white text-primary mb-4 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                정밀 측정을 위해 <br />
                기본 정보를 입력해 주세요.
              </h1>
            </div>
          </header>

          <section className="flex-1 space-y-8">
            {/* Gender Selection */}
            <div className="space-y-3">
              <p className="text-gray-900 font-black text-sm ml-1">성별을 선택해 주세요</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setGender(0)}
                  className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${gender === 0 ? 'border-primary bg-primary/20 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${gender === 0 ? 'bg-primary text-gray-900 shadow-sm' : 'bg-gray-100'}`}>
                     <User size={24} className={gender === 0 ? '' : 'text-gray-600'} />
                  </div>
                  <span className={`text-lg font-black text-gray-900`}>남성</span>
                </button>
                <button 
                  onClick={() => setGender(1)}
                  className={`p-8 rounded-[40px] border-2 transition-all flex flex-col items-center gap-4 ${gender === 1 ? 'border-primary bg-primary/20 shadow-xl' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${gender === 1 ? 'bg-primary text-gray-900 shadow-md' : 'bg-gray-100'}`}>
                     <UserRound size={32} className={gender === 1 ? '' : 'text-gray-600'} />
                  </div>
                  <span className={`text-xl font-black text-gray-900`}>여성</span>
                </button>
              </div>
            </div>

            {/* Age Selection */}
            <div className="space-y-4">
              <p className="text-gray-900 font-black text-lg ml-1 tracking-tight">나이를 입력해 주세요</p>
              <div className="bg-white rounded-[40px] p-6 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                <button 
                  onClick={() => setAge(Math.max(1, age - 1))}
                  className="w-16 h-16 rounded-[24px] bg-gray-50 flex items-center justify-center text-gray-900 font-black text-3xl active:scale-90 transition-all hover:bg-primary/20"
                >
                  -
                </button>
                <div className="text-center">
                  <input 
                    type="number"
                    value={age}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setAge(Math.min(120, Math.max(1, val)));
                      else if (e.target.value === '') setAge('' as any);
                    }}
                    className="w-24 bg-transparent text-6xl font-black text-gray-900 text-center focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xl font-black text-gray-600">세</span>
                </div>
                <button 
                  onClick={() => setAge(Math.min(120, age + 1))}
                  className="w-16 h-16 rounded-[24px] bg-gray-50 flex items-center justify-center text-gray-900 font-black text-3xl active:scale-90 transition-all hover:bg-primary/20"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleComplete}
            className="w-full py-6 bg-primary text-white rounded-[28px] text-xl font-black shadow-premium mt-8 flex justify-center gap-2"
          >
            입력 완료하고 다음으로
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
