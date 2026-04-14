'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Share2, Clipboard, Heart, Sun, Wind, ChevronRight, MessageSquare, Home, Sparkles, User, Activity, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [phq9, setPhq9] = useState(8);
  const [profile, setProfile] = useState<{ gender: number, age: number } | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [hasDoneAction, setHasDoneAction] = useState(false);

  useEffect(() => {
    // URL 파라미터에서 점수 읽기
    const params = new URLSearchParams(window.location.search);
    const urlPhq9 = params.get('phq9');
    const skip = params.get('skip_survey') === 'true';
    setIsSkipped(skip);

    // 활동 수행 여부 체크
    const done = localStorage.getItem('has_done_action') === 'true';
    setHasDoneAction(done);
    
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

  // User-Centric Calibration: Prioritize PHQ-9 Survey results
  const getCalibratedScore = () => {
    const hrvPhq = data?.phq9 || 0;
    
    // 만약 설문을 건너뛰었다면 생체 신호(HRV) 분석 점수를 사용합니다.
    if (isSkipped) return hrvPhq; 

    // 설문을 완료했다면 사용자 답변(PHQ-9)을 최우선으로 신뢰합니다.
    // 이는 "설문 점수가 낮으면 HRV가 위험하더라도 건강함으로 보정"한다는 요청에 따릅니다.
    return phq9;
  };

  const finalScore = getCalibratedScore();

  const getRiskLevel = (score: number) => {
    if (score === -1) return {
      status: "심박 변이도 분석 정밀 진단",
      msg: "오늘은 설문 없이 생체 신호 기반 분석을 진행했습니다.",
      desc: "설문 주기는 4주이며, 현재는 심장의 생체 활성도를 위주로 분석합니다.",
      guide: "규칙적인 운동과 충분한 수면은 심박변이도 수치를 높이고 심장 건강을 개선하는 데 큰 도움이 됩니다.",
      color: "text-blue-500", bg: "bg-blue-50"
    };

    if (score < 10) return { 
      status: "안정 및 가벼운 우울", 
      msg: "현재 마음이 비교적 편안한 상태입니다. 마음의 날씨가 대체로 맑은 편이에요.", 
      desc: "이 구간은 일상적인 스트레스 수준이거나 마음이 비교적 건강한 상태입니다.",
      guide: "가벼운 산책, 명상 등 현재의 좋은 컨디션을 유지하기 위한 가벼운 데일리 루틴을 추천해 드려요.",
      color: "text-green-500", bg: "bg-green-50" 
    };
    if (score < 20) return { 
      status: "중등도 ~ 약간 심한 우울", 
      msg: "마음이 많이 지치고 우울감이 머물러 있습니다. 지금은 마음을 보살피는 데 집중해야 할 시간입니다.", 
      desc: "마음의 에너지가 떨어져 주의가 필요하며, 적극적인 환기와 도움이 필요한 구간입니다.",
      guide: "심리 상담 센터 방문 상담을 권장하며, 앱 내 마음 챙김 콘텐츠를 보시며 쉬어가는 것을 추천합니다.",
      color: "text-amber-500", bg: "bg-amber-50" 
    };
    return { 
      status: "심한 우울", 
      msg: "마음이 많이 아프고 힘든 상태입니다. 혼자 견디지 마세요. 전문가의 도움이 꼭 필요합니다.", 
      desc: "일상생활에 큰 지장을 받고 있을 확률이 높으며, 전문가의 개입이 필요한 구간입니다.",
      guide: "전문가 상담 예약, 병원 방문 및 적극적인 치료를 받으시기를 진심으로 권장합니다.",
      color: "text-red-500", bg: "bg-red-50" 
    };
  };

  const getBpmStatus = (age: number, bpm: number) => {
    let min = 60, max = 100;
    if (age < 1) { min = 80; max = 160; }
    else if (age <= 2) { min = 80; max = 130; }
    else if (age <= 4) { min = 80; max = 120; }
    else if (age <= 11) { min = 75; max = 118; }
    else { min = 60; max = 100; }

    if (bpm < min) return { label: "낮음", color: "text-blue-500", bg: "bg-blue-50" };
    if (bpm <= max) return { label: "안정", color: "text-green-600", bg: "bg-green-50" };
    if (bpm <= max + 20) return { label: "불안정", color: "text-amber-500", bg: "bg-amber-50" };
    return { label: "위험", color: "text-red-500", bg: "bg-red-50" };
  };

  const getHrvAnalysis = (age: number, hrv_ms: number) => {
    const standards = [
      { maxAge: 24, min: 26, max: 85 },
      { maxAge: 34, min: 23, max: 77 },
      { maxAge: 44, min: 20, max: 66 },
      { maxAge: 54, min: 18, max: 58 },
      { maxAge: 64, min: 16, max: 50 },
      { maxAge: 74, min: 14, max: 44 },
      { maxAge: 150, min: 12, max: 39 },
    ];
    const range = standards.find(s => age <= s.maxAge) || standards[standards.length - 1];
    if (hrv_ms < range.min) return { label: "주의 및 휴식", color: "text-amber-500", bg: "bg-amber-50" };
    if (hrv_ms <= range.max) return { label: "안정적 심박 상태", color: "text-green-600", bg: "bg-green-50" };
    return { label: "매우 우수", color: "text-blue-600", bg: "bg-blue-50" };
  };

  const getElderlySummary = (hrv: number, bpm: number, score: number) => {
    if (isSkipped) return "심박변이도는 심장이 얼마나 건강하게 활동하는지를 나타냅니다. 사용자님의 현재 수치를 바탕으로 분석한 건강 조언입니다.";
    if (score >= 20) return "마음이 많이 아프고 힘든 상태입니다. 전문가의 도움이 꼭 필요합니다.";
    if (score >= 10) return "마음이 많이 지치고 우울감이 머물러 있네요. 보살핌이 필요한 시간입니다.";
    return "현재 마음이 비교적 편안한 상태입니다. 기분을 잘 유지해 보세요.";
  };

  const risk = getRiskLevel(finalScore);
  const bpmInfo = getBpmStatus(profile?.age || 70, data?.bpm || 72);
  const hrvInfo = getHrvAnalysis(profile?.age || 70, data?.hrv_ms || 42);

  const displayMsg = isSkipped 
    ? "사용자님의 심박 변이도 신호를 정밀 분석한 결과입니다."
    : risk.msg;

  const displayStatus = risk.status;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative pb-96">
      {/* Header */}
      <header className="p-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-40 text-gray-900">
        <button onClick={() => router.back()} className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6 text-white" strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black">오늘의 상태</h1>
        <button className="p-3 bg-white rounded-2xl shadow-sm text-gray-400">
          <Share2 className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-8 pt-6 space-y-10 text-gray-900">
        <section className="text-center space-y-4 py-8">
          {profile && (
            <p className="text-gray-900 font-black text-xs tracking-[0.2em] uppercase opacity-40 mb-2">
              {profile.age}세 {profile.gender === 0 ? '남성' : '여성'} 어르신
            </p>
          )}
          <div className="inline-flex p-8 bg-primary rounded-[40px] shadow-xl mb-4">
            <Heart className="w-16 h-16 text-gray-900 fill-white/20" />
          </div>
          <h2 className="text-5xl font-black text-gray-900 leading-[1.1] tracking-tighter">{displayStatus}</h2>
          <p className="text-2xl text-gray-900 font-bold leading-relaxed px-2">{displayMsg}</p>
        </section>

        {/* AI Advice Card */}
        <section className="bg-white rounded-[56px] p-10 border-2 border-primary/10 shadow-premium">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-primary/20 rounded-2xl"><Sparkles className="w-8 h-8 text-gray-900" /></div>
             <h3 className="text-xl font-black text-gray-900">마음이음의 조언</h3>
          </div>
          <p className="text-[22px] text-gray-900 leading-[1.7] font-black tracking-tight">
            "{getElderlySummary(data?.hrv_ms || 42, data?.bpm || 72, finalScore)}"
          </p>
        </section>

      </main>

      {/* Action Buttons Section */}
      <div className="fixed bottom-24 left-0 right-0 px-8 z-40 max-w-md mx-auto space-y-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-12 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/reports')}
            className="flex-1 py-6 bg-white text-gray-900 border-2 border-gray-100 rounded-[32px] text-xl font-black shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <TrendingUp className="w-6 h-6" />
            <span>변화 확인</span>
          </button>
          <button 
            onClick={() => router.push('/therapy')}
            className="flex-1 py-6 bg-primary text-gray-900 rounded-[32px] text-xl font-black shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Zap className="w-6 h-6 fill-current" />
            <span>치료하기</span>
          </button>
        </div>

        {hasDoneAction && (
          <button 
            onClick={() => {
              localStorage.removeItem('has_done_action'); 
              router.push('/');
            }}
            className="w-full py-6 bg-gray-900 text-white rounded-[32px] text-2xl font-black shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Activity className="w-7 h-7 text-primary" />
            <span>다시 측정하기</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-10 flex justify-between items-center z-50 max-w-md mx-auto">
        <button onClick={() => router.push('/')} className="hover:scale-110 transition-transform">
          <Home className="w-6 h-6 text-gray-900" />
        </button>
        <div className="relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-primary rounded-full shadow-premium text-white">
            <Activity className="w-7 h-7" />
          </div>
        </div>
        <button onClick={() => router.push('/therapy')} className="hover:scale-110 transition-transform">
          <Zap className="w-6 h-6 text-gray-900" />
        </button>
        <button onClick={() => router.push('/profile')} className="hover:scale-110 transition-transform">
          <User className="w-6 h-6 text-gray-900" />
        </button>
      </footer>
    </div>
  );
}
