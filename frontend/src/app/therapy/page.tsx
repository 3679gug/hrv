'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TherapyPage() {
  const router = useRouter();

  const handleGoHome = () => {
    // 치료를 마쳤음을 기록합니다.
    localStorage.setItem('has_done_action', 'true');
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f9fafb_100%)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full max-w-md flex flex-col items-center gap-12"
      >
        {/* Decorative Space */}
        <div className="h-64 flex items-center justify-center">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-48 h-48 bg-primary/5 rounded-full blur-3xl"
          />
        </div>

        {/* Home Button (The only focus) */}
        <button
          onClick={handleGoHome}
          className="group relative flex flex-col items-center gap-6 p-12 bg-primary rounded-[48px] shadow-[0_32px_64px_-16px_rgba(30,64,175,0.4)] hover:shadow-[0_48px_80px_-20px_rgba(30,64,175,0.5)] active:scale-95 transition-all w-full"
        >
          <div className="p-6 bg-white/20 rounded-full backdrop-blur-md group-hover:scale-110 transition-transform duration-500">
            <Home className="w-12 h-12 text-white" />
          </div>
          <span className="text-4xl font-black text-white tracking-tighter">처음으로</span>
          
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-primary rounded-full text-sm font-bold shadow-lg border border-primary/10 whitespace-nowrap">
            치료를 완료했습니다
          </div>
        </button>

        <p className="text-gray-400 font-medium text-lg opacity-60">
          마음이 한결 편안해지셨나요?
        </p>
      </motion.div>
    </main>
  );
}
