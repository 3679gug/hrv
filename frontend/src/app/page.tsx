'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, User, Sparkles, Heart, ClipboardCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStart = (type: string) => {
    localStorage.setItem('flow_type', type);
    router.push('/measure');
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-12 max-w-md mx-auto relative overflow-hidden">
      {/* Header - 제목 제거 */}
      <header className="p-8 flex justify-between items-center bg-background sticky top-0 z-10 bg-opacity-80 backdrop-blur-md">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full text-gray-900 hover:bg-gray-100 transition-colors">
          <ChevronLeft size={32} strokeWidth={3} />
        </button>
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
          <User className="w-full h-full p-2 text-gray-400" />
        </div>
      </header>

      {/* Options Section - 기존 디자인 복원 */}
      <section className="px-6 pb-20 pt-4 space-y-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8 }}
        >
          <div className="w-full relative overflow-hidden group bg-primary rounded-[60px] aspect-[2/3.1] p-12 shadow-2xl transition-all text-left flex flex-col justify-between border-8 border-white/50">
            <div className="relative z-10 pt-10">
              <div className="space-y-8">
                <h3 className="text-7xl font-black text-gray-900 leading-[1] tracking-tighter">
                  마음 이음
                </h3>
                <div className="w-24 h-3 bg-gray-900/10 rounded-full" />
                <p className="text-gray-900 font-black text-3xl leading-relaxed">
                  마음보기의 시작
                </p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-4">
              <button 
                onClick={() => handleStart('3')}
                className="flex items-center justify-between text-gray-900 font-black text-2xl bg-white/90 backdrop-blur-sm px-10 py-6 rounded-full shadow-2xl active:scale-95 transition-all w-full"
              >
                <span>진단하기</span>
                <ArrowRight size={32} />
              </button>
              <button 
                onClick={() => router.push('/therapy')}
                className="flex items-center justify-between text-[#854d0e] font-black text-2xl bg-[#FEF9C3]/90 backdrop-blur-sm px-10 py-6 rounded-full shadow-2xl active:scale-95 transition-all w-full"
              >
                <span>치료하기</span>
                <ArrowRight size={32} />
              </button>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[11px] text-gray-900 mt-12 font-bold tracking-tight px-8 leading-relaxed italic opacity-80">
          * 이 검사는 정밀 HRV 측정과 9문항의 설문을 포함하며, <br />
          모든 데이터는 기기 내에서만 즉시 분석됩니다.
        </p>
      </section>
    </main>
  );
}
