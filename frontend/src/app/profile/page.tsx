'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, UserRound, ArrowRight } from 'lucide-react';
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
            <div className="space-y-6">
              <p className="text-gray-900 font-extrabold text-2xl ml-1">성별을 선택하세요</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setGender(0)}
                  className={`p-6 rounded-[40px] border-4 transition-all flex flex-col items-center gap-2 ${gender === 0 ? 'border-primary bg-primary/20 shadow-2xl scale-[1.02]' : 'border-gray-100 bg-white text-gray-400'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${gender === 0 ? 'bg-primary text-gray-900 shadow-md' : 'bg-gray-100'}`}>
                     <User size={32} className={gender === 0 ? '' : 'text-gray-400'} />
                  </div>
                  <span className="text-2xl font-black text-gray-900">남성</span>
                </button>
                <button 
                  onClick={() => setGender(1)}
                  className={`p-6 rounded-[40px] border-4 transition-all flex flex-col items-center gap-2 ${gender === 1 ? 'border-primary bg-primary/20 shadow-2xl scale-[1.02]' : 'border-gray-100 bg-white text-gray-400'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${gender === 1 ? 'bg-primary text-gray-900 shadow-md' : 'bg-gray-100'}`}>
                     <UserRound size={32} className={gender === 1 ? '' : 'text-gray-400'} />
                  </div>
                  <span className="text-2xl font-black text-gray-900">여성</span>
                </button>
              </div>
            </div>

            {/* Age Selection */}
            <div className="space-y-6">
              <p className="text-gray-900 font-extrabold text-2xl ml-1">나이를 누르세요</p>
              <div className="bg-white rounded-[40px] p-6 border-4 border-gray-100 shadow-xl flex items-center justify-between">
                <button 
                  onClick={() => setAge(Math.max(1, age - 1))}
                  className="w-16 h-16 rounded-[24px] bg-gray-100 flex items-center justify-center text-gray-900 font-black text-4xl active:scale-90 transition-all hover:bg-primary/30"
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
                    }}
                    className="w-24 bg-transparent text-6xl font-black text-gray-900 text-center focus:outline-none"
                  />
                  <p className="text-xl font-black text-gray-400 mt-1">살</p>
                </div>
                <button 
                  onClick={() => setAge(Math.min(120, age + 1))}
                  className="w-16 h-16 rounded-[24px] bg-gray-100 flex items-center justify-center text-gray-900 font-black text-4xl active:scale-90 transition-all hover:bg-primary/30"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          <button 
            onClick={handleComplete}
            className="w-full h-28 bg-primary text-gray-900 rounded-[48px] text-3xl font-black shadow-2xl mt-8 flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
          >
            입력 완료
            <ArrowRight size={36} />
          </button>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
