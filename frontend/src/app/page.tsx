'use client';

import React from 'react';
import { ChevronLeft, User, Heart, Activity, ArrowRight, Zap, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStart = (type: string) => {
    localStorage.setItem('flow_type', type);
    router.push('/measure');
  };

  return (
    <main>
      {/* 폰 베젤 틀(main) 내부로 모든 요소를 가둡니다 */}
      <div className="h-full w-full bg-white text-gray-900 pb-12 relative flex flex-col font-sans">
        {/* 상단바: 고정 연노란색 */}
        <header className="absolute top-0 left-0 right-0 h-12 px-6 flex justify-between items-center border-b border-yellow-100 z-50" style={{ backgroundColor: 'var(--primary)' }}>
          <button onClick={() => router.back()} className="text-gray-900/80 p-0.5">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="text-xs font-black tracking-tight">9:41</span>
          <div className="w-5" />
        </header>

        <div className="flex-1 overflow-y-auto px-5 pt-14 pb-4 space-y-4 scrollbar-hide">
          {/* 환영 카드: 고정 연노란색 */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-[28px] p-6 border-4 border-yellow-100 shadow-xl shadow-yellow-500/5"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <div className="text-[10px] font-black text-gray-400 mb-1 tracking-widest uppercase">마음 이음</div>
            <h1 className="text-xl font-black text-gray-900 leading-[1.3] mb-3 break-keep">
              안녕하세요, 김민준님<br />
              오늘도 함께 해봐요
            </h1>

            <div className="flex items-center gap-3">
              <div className="text-2xl font-black text-gray-900">12</div>
              <div className="text-gray-900/60 font-bold leading-tight underline decoration-yellow-200 decoration-4 underline-offset-4">
                일 연속 훈련 중<br />
                <span className="text-[10px] opacity-60 font-bold tracking-tight">어제도 잘 하셨어요!</span>
              </div>
            </div>
          </motion.section>

          {/* 메뉴 리스트 */}
          <div className="w-full space-y-3">
            <button 
              onClick={() => handleStart('3')}
              className="w-full bg-white border-2 border-gray-50 rounded-[24px] p-5 flex items-center justify-start group active:scale-95 transition-all shadow-sm"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-lg font-black text-gray-900">진단하기</span>
                <span className="text-gray-400 font-bold text-xs mt-0.5">자연스럽게 상태 측정</span>
              </div>
            </button>

            <button 
              onClick={() => router.push('/therapy')}
              className="w-full bg-white border-2 border-gray-50 rounded-[24px] p-5 flex items-center justify-start group active:scale-95 transition-all shadow-sm"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-lg font-black text-gray-900">치료하기</span>
                <span className="text-gray-400 font-bold text-xs mt-0.5">나만의 맞춤 상담</span>
              </div>
            </button>
          </div>
        </div>

        {/* 하단 내비게이션 바 */}
        <nav className="absolute bottom-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-6 z-50">
          <button onClick={() => router.push('/')} className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-yellow-600/80">홈</span>
          </button>
          <button onClick={() => handleStart('3')} className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-gray-400">진단</span>
          </button>
          <button onClick={() => router.push('/therapy')} className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-gray-400">치료</span>
          </button>
        </nav>
      </div>
    </main>
  );
}
