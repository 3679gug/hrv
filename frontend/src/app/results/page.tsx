'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Zap, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [phq9, setPhq9] = useState(0);
  const [profile, setProfile] = useState<{ gender: number, age: number } | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPhq9 = params.get('phq9');
    const skip = params.get('skip_survey') === 'true';
    setIsSkipped(skip);

    const rawHrv = localStorage.getItem('hrv_result');
    const rawPhq9 = localStorage.getItem('phq9_score');
    const rawProfile = localStorage.getItem('user_profile');
    
    if (rawHrv) setData(JSON.parse(rawHrv));
    if (rawProfile) setProfile(JSON.parse(rawProfile));
    
    if (urlPhq9) {
      setPhq9(parseInt(urlPhq9));
    } else if (rawPhq9) {
      setPhq9(parseInt(rawPhq9) || 0);
    }
  }, []);

  // PHQ-9 설문 70% + HRV 측정 예측 30% 블렌딩 점수 산출
  const getBlendedScore = () => {
    const hrvPhq9 = data?.phq9 ?? null;
    
    // HRV 측정 결과 없으면 설문 점수 100%
    if (hrvPhq9 === null || isSkipped) {
      return isSkipped ? (data?.phq9 || 0) : phq9;
    }
    // 설문 + HRV 7:3 블렌딩
    return Math.round(phq9 * 0.7 + hrvPhq9 * 0.3);
  };

  const getRiskLevel = (score: number) => {
    if (score < 10) return { 
      status: "안정 및 가벼운 우울", 
      msg: "현재 마음이 비교적 편안한 상태입니다.", 
    };
    if (score < 20) return { 
      status: "중등도 ~ 약간 심한 우울", 
      msg: "마음이 많이 지치고 우울감이 있습니다.", 
    };
    return { 
      status: "심한 우울", 
      msg: "마음이 많이 아프고 힘든 상태입니다.", 
    };
  };

  const blendedScore = getBlendedScore();
  const risk = getRiskLevel(blendedScore);
  const hasHrv = data?.phq9 !== undefined && data?.phq9 !== null && !isSkipped;
  const displayMsg = isSkipped
    ? "생체 신호 정밀 분석 결과입니다."
    : hasHrv
    ? `설문 70% · 생체신호 30% 복합 분석 결과입니다.`
    : risk.msg;

  return (
    <main>
      <div className="h-full w-full bg-white flex flex-col font-sans relative">
        {/* 상단바: 고정 연노란색 (한글화) */}
        <header className="absolute top-0 left-0 right-0 h-12 px-6 flex justify-between items-center border-b border-yellow-100 z-50 transition-all font-sans" style={{ backgroundColor: '#FFFBEB' }}>
          <button onClick={() => router.back()} className="text-gray-900/80 p-1 active:scale-90 transition-all">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <span className="text-lg font-black tracking-tighter text-gray-900">마음의 상태</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 px-6 pt-16 flex flex-col items-center overflow-y-auto scrollbar-hide">
          <section className="w-full text-center space-y-4 pt-4 mb-6">
            {profile && (
              <p className="text-gray-900 font-black text-[9px] tracking-[0.2em] uppercase opacity-20 mb-1">
                {profile.age}세 {profile.gender === 0 ? '남성' : '여성'} 어르신
              </p>
            )}
            <div className="inline-flex p-5 rounded-[32px] shadow-sm mb-3 border-4 border-white" style={{ backgroundColor: '#FFFBEB' }}>
              <Heart className="w-8 h-8 text-gray-900 fill-white/20" />
            </div>
            <h2 className="text-xl font-black text-gray-900 leading-[1.2] tracking-tight break-keep">{risk.status}</h2>
            <p className="text-sm text-gray-500 font-bold leading-snug px-4">{displayMsg}</p>
          </section>

          {/* 7:3 블렌딩 점수 시각화 카드 */}
          {hasHrv && (
            <div className="w-full mb-4 p-4 rounded-[24px] border border-gray-100 bg-gray-50 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">복합 분석 기여도</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-gray-600 w-16 text-right">설문 70%</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '70%', backgroundColor: '#FFFBEB', border: '1.5px solid #F59E0B' }} />
                </div>
                <span className="text-xs font-black text-amber-600 w-8">{phq9}점</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-600 w-16 text-right">생체신호 30%</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-800 rounded-full" style={{ width: '30%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 w-8">{Math.round(data?.phq9 ?? 0)}점</span>
              </div>
              <div className="mt-3 flex justify-between items-center px-1">
                <span className="text-[10px] text-gray-400 font-bold">최종 복합 점수</span>
                <span className="text-base font-black text-gray-900">{blendedScore}점</span>
              </div>
            </div>
          )}

          <div className="w-full space-y-3 pb-20">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => router.push('/reports')}
                className="flex-1 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-[24px] text-base font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <TrendingUp className="w-4 h-4" />
                <span>변화 확인</span>
              </button>
              <button 
                onClick={() => router.push('/therapy')}
                className="flex-1 py-4 text-gray-900 rounded-[24px] text-base font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                style={{ backgroundColor: '#FFFBEB' }}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>마음 훈련</span>
              </button>
            </div>

            <button 
              onClick={() => {
                localStorage.removeItem('has_done_action'); 
                router.push('/');
              }}
              className="w-full py-4 bg-gray-900 text-white rounded-[24px] text-lg font-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <Activity className="w-5 h-5 text-yellow-300" />
              <span>다시 검사하기</span>
            </button>
          </div>
        </div>

        {/* 하단바 한글화 및 통일 */}
        <nav className="absolute bottom-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-6 z-50">
          <button onClick={() => router.push('/')} className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-gray-400">홈</span>
          </button>
          <button className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-yellow-600/80">진단</span>
          </button>
          <button onClick={() => router.push('/therapy')} className="flex-1 flex flex-col items-center py-1">
            <span className="text-xs font-black text-gray-400">치료</span>
          </button>
        </nav>
      </div>
    </main>
  );
}
