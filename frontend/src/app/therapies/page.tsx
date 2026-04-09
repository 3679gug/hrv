'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sun, Wind, ChevronRight, CheckCircle2, History } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TherapiesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative pb-12 font-sans overflow-x-hidden">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md">
        <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-primary transition-all ring-1 ring-gray-100">
           <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">치료 활동 로그</h1>
        <div className="w-12 h-12 flex items-center justify-center">
           <History className="text-gray-300" />
        </div>
      </header>

      <section className="px-6 space-y-6">
         <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-2">오늘의 달성률</h2>
            <div className="flex items-end gap-3 mb-6">
                <span className="text-5xl font-black text-primary tracking-tighter">100</span>
                <span className="text-xl font-bold text-gray-400 mb-1">%</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-primary w-full h-full rounded-full"></div>
            </div>
            <p className="text-sm font-bold text-gray-500 mt-4">오늘 계획된 활동을 모두 완료했습니다! 훌륭해요.</p>
         </div>

         <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 px-2 mt-4 flex items-center gap-2">
               완료 내역 <CheckCircle2 size={18} className="text-emerald-500" />
            </h2>
            
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-start gap-4">
               <div className="w-12 h-12 rounded-2xl bg-orange-50 flex flex-shrink-0 items-center justify-center mt-1">
                  <Sun size={24} className="text-orange-500" />
               </div>
               <div>
                  <div className="flex justify-between items-center mb-1">
                     <h3 className="text-[17px] font-black text-gray-900">햇볕 아래 감각 요법</h3>
                     <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">오전 10:20</span>
                  </div>
                  <p className="text-sm text-gray-500 font-bold leading-relaxed">
                     따뜻한 햇살 아래에서 15분간 산책하며 세로토닌을 충전했습니다.
                  </p>
               </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-start gap-4">
               <div className="w-12 h-12 rounded-2xl bg-blue-50 flex flex-shrink-0 items-center justify-center mt-1">
                  <Wind size={24} className="text-blue-500" />
               </div>
               <div>
                  <div className="flex justify-between items-center mb-1">
                     <h3 className="text-[17px] font-black text-gray-900">깊은 복식 호흡</h3>
                     <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">오후 03:45</span>
                  </div>
                  <p className="text-sm text-gray-500 font-bold leading-relaxed">
                     긴장을 풀고 복식 호흡을 하여 자율신경계 균형을 맞췄습니다.
                  </p>
               </div>
            </div>
         </div>

         <div className="pt-8 text-center">
            <span className="inline-flex px-4 py-2 bg-gray-200/50 rounded-full text-[11px] font-black tracking-widest uppercase text-gray-400">
               맞춤형 디지털 치료 솔루션
            </span>
         </div>
      </section>
    </div>
  );
}
