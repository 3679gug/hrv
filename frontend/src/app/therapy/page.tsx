'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, MessageCircle, Heart, TrendingUp, ChevronLeft, Phone, ClipboardList, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TherapyPage() {
  const router = useRouter();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'therapy' | 'record' | 'activity' | 'gratitude'>('therapy');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 사이즈 통치 (EW 규격: h-10, px-6, 400x780)
  return (
    <main>
      <div className="h-full w-full bg-white flex flex-col font-sans relative overflow-hidden">
        {/* 상단바: EW 규격 통일 (h-10, px-6) */}
        {!sessionStarted && (
          <header className="absolute top-0 left-0 right-0 h-10 px-6 flex justify-between items-center border-b border-yellow-100 z-50" style={{ backgroundColor: '#FFFBEB' }}>
            <button onClick={() => router.push('/')} className="text-gray-900/80 p-0.5">
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-black tracking-tight text-gray-900">
              {activeTab === 'therapy' ? '마음 훈련' : activeTab === 'record' ? '기특한 변화' : activeTab === 'activity' ? '자기관리' : '감사일기'}
            </span>
            <div className="w-5" />
          </header>
        )}

        <div className="flex-1 overflow-y-auto px-6 pt-14 pb-24 scrollbar-hide">
          {!sessionStarted ? (
            activeTab === 'therapy' && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-10 pt-4 text-center">
                <Image src="/maeum_logo_final.png" alt="마음이음" width={180} height={100} className="object-contain" priority />
                <div className="space-y-4">
                  <h2 className="text-3xl font-black text-gray-900 leading-tight">마음이음과<br />대화하기</h2>
                  <p className="text-lg text-gray-400 font-bold leading-relaxed px-4">따뜻하게 어르신의 이야기를<br />들어줄 준비가 되었어요.</p>
                </div>
                <button 
                  onClick={() => setSessionStarted(true)}
                  className="w-full bg-[#FFFBEB] rounded-[32px] p-8 flex items-center justify-between border-4 border-yellow-100 shadow-sm active:scale-95 transition-all mt-6"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-yellow-600/40 tracking-widest uppercase">훈련 시작</span>
                    <span className="text-2xl font-black text-gray-900">상담 시작하기</span>
                  </div>
                  <div className="bg-white p-4 rounded-full shadow-md">
                    <Phone size={24} className="text-gray-900" />
                  </div>
                </button>
              </motion.section>
            )
          ) : (
            /* 실제 채팅 UI는 사이즈 조정을 위해 간략화하거나 규격 내 배치 */
            <div className="h-full flex flex-col">
              <header className="flex justify-between items-center pb-6 h-10">
                <button onClick={() => setSessionStarted(false)}><ChevronLeft size={24} /></button>
                <span className="text-base font-black">대화 중</span>
                <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className="p-2 bg-[#FFFBEB] rounded-full">
                  {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </header>
              <div className="flex-1 bg-gray-50 rounded-[32px] p-6 flex items-center justify-center text-gray-400 font-bold">
                대화가 진행 중입니다...
              </div>
            </div>
          )}
        </div>

        {/* 하단 내비게이션: EW 규격 (h-14, absolute) */}
        {!sessionStarted && (
          <nav className="absolute bottom-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-4 z-50">
            <button onClick={() => router.push('/')} className="flex-1 flex flex-col items-center py-1">
              <Home size={22} className="text-gray-300" />
              <span className="text-[9px] font-black text-gray-400 mt-1">홈</span>
            </button>
            <button onClick={() => setActiveTab('therapy')} className={`flex-1 flex flex-col items-center py-1 ${activeTab === 'therapy' ? 'text-yellow-600' : 'text-gray-300'}`}>
              <MessageCircle size={22} className={activeTab === 'therapy' ? 'text-yellow-600' : 'text-gray-300'} />
              <span className={`text-[9px] font-black mt-1 ${activeTab === 'therapy' ? 'text-yellow-600' : 'text-gray-400'}`}>대화</span>
            </button>
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex flex-col items-center py-1 ${activeTab === 'record' ? 'text-yellow-600' : 'text-gray-300'}`}>
              <ClipboardList size={22} className={activeTab === 'record' ? 'text-yellow-600' : 'text-gray-300'} />
              <span className={`text-[9px] font-black mt-1 ${activeTab === 'record' ? 'text-yellow-600' : 'text-gray-400'}`}>기록</span>
            </button>
            <button onClick={() => setActiveTab('activity')} className={`flex-1 flex flex-col items-center py-1 ${activeTab === 'activity' ? 'text-yellow-600' : 'text-gray-300'}`}>
              <TrendingUp size={22} className={activeTab === 'activity' ? 'text-yellow-600' : 'text-gray-300'} />
              <span className={`text-[9px] font-black mt-1 ${activeTab === 'activity' ? 'text-yellow-600' : 'text-gray-400'}`}>관리</span>
            </button>
            <button onClick={() => setActiveTab('gratitude')} className={`flex-1 flex flex-col items-center py-1 ${activeTab === 'gratitude' ? 'text-yellow-600' : 'text-gray-300'}`}>
              <Heart size={22} className={activeTab === 'gratitude' ? 'text-yellow-600' : 'text-gray-300'} />
              <span className={`text-[9px] font-black mt-1 ${activeTab === 'gratitude' ? 'text-yellow-600' : 'text-gray-400'}`}>감사</span>
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
