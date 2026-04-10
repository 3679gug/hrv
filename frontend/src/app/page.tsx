'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Sparkles, Heart, ClipboardCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStart = (type: string) => {
    localStorage.setItem('flow_type', type);
    router.push('/profile');
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-12 max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-background sticky top-0 z-10 bg-opacity-80 backdrop-blur-md">
        <button className="p-2 rounded-full text-primary hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-primary">심리 검사 선택</h1>
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
          <User className="w-full h-full p-2 text-gray-400" />
        </div>
      </header>

      {/* Options Section (Single Large Card) */}
      <section className="px-6 pb-20 pt-8">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8 }}
        >
          <button 
            onClick={() => handleStart('3')} 
            className="w-full relative overflow-hidden group bg-primary rounded-[56px] aspect-[2/3.2] p-12 shadow-xl active:scale-[0.98] transition-all text-left flex flex-col justify-between"
          >
            <div className="relative z-10 pt-8">
              <div className="space-y-6">
                <h3 className="text-5xl font-black text-white leading-[1.15] tracking-tight">
                  마음 이음
                </h3>
                <p className="text-white/80 font-medium text-2xl leading-relaxed max-w-[280px]">
                  나의 마음을 이어 주는 고마운 기술, <br />
                  과학적 분석으로 확인해보세요.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between group">
              <div className="flex items-center gap-3 text-white font-black text-xl">
                 <span>지금 시작</span>
                 <ArrowRight size={28} className="group-hover:translate-x-3 transition-transform" />
              </div>
            </div>
          </button>
        </motion.div>

        <p className="text-center text-[11px] text-gray-900 mt-12 font-bold tracking-tight px-8 leading-relaxed italic opacity-80">
          * 이 검사는 정밀 HRV 측정과 9문항의 설문을 포함하며, <br />
          모든 데이터는 기기 내에서만 즉시 분석됩니다.
        </p>
      </section>
    </main>
  );
}
