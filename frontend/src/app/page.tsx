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
      <header className="p-8 flex justify-between items-center bg-background sticky top-0 z-10 bg-opacity-80 backdrop-blur-md">
        <button className="p-2 rounded-full text-gray-900 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-900">심리 검사 선택</h1>
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
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
            className="w-full relative overflow-hidden group bg-primary rounded-[40px] aspect-[2/2.8] p-8 shadow-2xl active:scale-[0.98] transition-all text-left flex flex-col justify-between"
          >
            <div className="relative z-10 pt-4">
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-gray-900 leading-[1.1] tracking-tighter">
                  마음 이음
                </h3>
                <div className="w-12 h-1 bg-gray-900/20 rounded-full" />
                <p className="text-gray-900/80 font-bold text-base leading-relaxed">
                  마음보기의 시작
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center group">
              <div className="flex items-center gap-3 text-gray-900 font-black text-lg bg-white/40 backdrop-blur-md px-5 py-3.5 rounded-full border border-white/20">
                 <span>지금 시작</span>
                 <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
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
