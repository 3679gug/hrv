'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Brain, Activity, ChevronRight, TrendingUp, Sparkles, Filter, Info, Sun, Wind, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportDataItem {
  label: string;
  phq9: number;
  hrv: number;
  bpm: number;
  stress_index?: number;
}

// --- MOCK DATA GENERATOR ---
const generateMockData = (type: 'daily' | 'weekly' | 'monthly' | 'yearly'): ReportDataItem[] => {
  const data: ReportDataItem[] = [];
  if (type === 'daily') {
    const hours = [8, 11, 14, 17, 20, 23];
    hours.forEach(h => {
      data.push({
        label: `${h}시`,
        phq9: Math.floor(Math.random() * 10) + 5,
        hrv: Math.floor(Math.random() * 20) + 40,
        bpm: Math.floor(Math.random() * 15) + 65,
        stress_index: Math.floor(Math.random() * 20) + 30,
      });
    });
  } else if (type === 'weekly') {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    days.forEach(d => {
      data.push({
        label: d,
        phq9: Math.floor(Math.random() * 15) + 3,
        hrv: Math.floor(Math.random() * 25) + 35,
        bpm: Math.floor(Math.random() * 20) + 65,
        stress_index: Math.floor(Math.random() * 25) + 35,
      });
    });
  } else if (type === 'monthly') {
    for (let i = 1; i <= 30; i += 5) {
      data.push({
        label: `${i}일`,
        phq9: Math.floor(Math.random() * 15) + 5,
        hrv: Math.floor(Math.random() * 25) + 35,
        bpm: Math.floor(Math.random() * 20) + 65,
        stress_index: Math.floor(Math.random() * 30) + 40,
      });
    }
  } else {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    months.forEach(m => {
      data.push({
        label: m,
        phq9: Math.floor(Math.random() * 20) + 2,
        hrv: Math.floor(Math.random() * 30) + 30,
        bpm: Math.floor(Math.random() * 20) + 65,
      });
    });
  }
  return data;
};

// --- CHART COMPONENT ---
const TrendChart = ({ data, colors, showPhq9 = false }: { data: ReportDataItem[], colors: { phq9: string, hrv: string }, showPhq9?: boolean }) => {
  const width = 400;
  const height = 240;
  const padding = 45;

  const getY = (val: number, max: number) => height - padding - (val / max) * (height - 2 * padding);
  const getX = (idx: number) => padding + (idx / (data.length - 1)) * (width - 2 * padding);

  const phq9Points = data.map((d, i) => `${getX(i)},${getY(d.phq9, 30)}`).join(' ');
  const hrvPoints = data.map((d, i) => `${getX(i)},${getY(d.hrv, 100)}`).join(' ');

  return (
    <div className="w-full h-[280px] bg-white rounded-[40px] p-4 relative overflow-hidden shadow-inner bg-gray-50/30">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* Y Axis Labels */}
        {[0, 50, 100].map(val => (
          <text key={val} x={padding - 10} y={getY(val, 100) + 4} className="text-[10px] fill-gray-300 font-bold" textAnchor="end">
            {val}
          </text>
        ))}

        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={height - padding + 20} className="text-[11px] fill-gray-400 font-bold" textAnchor="middle">
            {d.label}
          </text>
        ))}

        {/* PHQ-9 (Mental) Line - Only on Monthly/Yearly */}
        {showPhq9 && (
          <>
            <motion.polyline
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              fill="none"
              stroke={colors.phq9}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={phq9Points}
              style={{ filter: 'drop-shadow(0 4px 6px rgba(249, 115, 22, 0.2))' }}
            />
            {data.map((d, i) => (
              <motion.circle 
                key={`p-${i}`} 
                cx={getX(i)} 
                cy={getY(d.phq9, 30)} 
                r="6" 
                fill="white" 
                stroke={colors.phq9} 
                strokeWidth="3.5" 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.08 }}
              />
            ))}
          </>
        )}

        {/* HRV (Body) Line - Always Visible */}
        <motion.polyline
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
          fill="none"
          stroke={colors.hrv}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={hrvPoints}
          style={{ filter: 'drop-shadow(0 4px 6px rgba(45, 212, 191, 0.2))' }}
        />
        {data.map((d, i) => (
          <motion.circle 
            key={`h-${i}`} 
            cx={getX(i)} 
            cy={getY(d.hrv, 100)} 
            r="6" 
            fill="white" 
            stroke={colors.hrv} 
            strokeWidth="3.5" 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.0 + i * 0.08 }}
          />
        ))}

      </svg>
    </div>
  );
};

export default function ReportsPage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<'compare' | 'weekly' | 'monthly' | 'yearly'>('compare');
  const [chartData, setChartData] = useState<ReportDataItem[]>([]);
  const [actualData, setActualData] = useState<any>(null);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hrv_result');
      if (saved) setActualData(JSON.parse(saved));
    } catch {}
  }, []);
  
  // Show PHQ-9 line and legend ONLY on Monthly and Yearly views
  const showPhq9 = viewType === 'monthly' || viewType === 'yearly';

  useEffect(() => {
    // If 'compare' is selected, mock data will just act like 'daily' mapping
    const mockType = viewType === 'compare' ? 'daily' : viewType;
    setChartData(generateMockData(mockType));
    localStorage.setItem('has_done_action', 'true');
  }, [viewType]);

  const [colors] = useState({ phq9: '#f97316', hrv: '#2dd4bf' });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative pb-32 font-sans overflow-x-hidden">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md">
        <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-primary transition-all ring-1 ring-gray-100">
           <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">그동안의 건강 변화</h1>
        <button className="p-3 bg-white rounded-2xl shadow-sm text-gray-400">
           <Download size={24} />
        </button>
      </header>

      <section className="px-6 py-2 space-y-8">
        <div className="bg-gray-200/50 p-1.5 rounded-[28px] flex gap-1 shadow-inner ring-1 ring-gray-100">
          {(['compare', 'weekly', 'monthly', 'yearly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`flex-1 py-3 px-1 rounded-[22px] text-[13px] font-black transition-all ${
                viewType === type 
                  ? 'bg-white text-primary shadow-sm scale-[1.05]' 
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {type === 'compare' ? '어제와 비교' : type === 'weekly' ? '이번 주' : type === 'monthly' ? '이번 달' : '올해'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
           {viewType !== 'compare' && (
             <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {showPhq9 ? "마음과 몸의 변화 모습" : "몸의 활력 변화"}
                </h2>
                <div className="flex gap-4">
                   {showPhq9 && (
                     <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.phq9 }} />
                        <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">마음</span>
                     </div>
                   )}
                   <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.hrv }} />
                      <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">신체</span>
                   </div>
                </div>
             </div>
           )}

           <AnimatePresence mode="wait">
             <motion.div
               key={viewType}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.3 }}
               className="space-y-4"
             >
               {viewType === 'compare' ? (
                 <div className="bg-white rounded-[40px] p-8 text-center shadow-sm border border-gray-100 min-h-[280px] flex flex-col justify-center items-center">
                    <h3 className="text-2xl font-black text-gray-900 mb-6">어제와 비교</h3>
                    <p className="text-[17px] text-gray-600 font-bold leading-[1.8]">
                       {(actualData?.hrv_ms || chartData[chartData.length - 1]?.hrv || 0) >= (chartData[chartData.length - 2]?.hrv || 0)
                          ? "어제보다 더 컨디션이 좋아진 거 같습니다. 👏"
                          : "어제보다 더 피곤하신 상태인 거 같습니다. 휴식을 취해보세요. 🌿"}
                    </p>
                 </div>
               ) : (
                 <>
                   <TrendChart data={chartData} colors={colors} showPhq9={showPhq9} />
                   
                   <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mt-2">
                     <p className="text-[15px] font-bold text-gray-700 leading-relaxed text-center">
                        {(chartData[chartData.length - 1]?.hrv || 0) >= (chartData[chartData.length - 2]?.hrv || 0)
                          ? "이전 측정보다 더 컨디션이 좋아진 거 같습니다. 👏"
                          : "이전 측정보다 더 피곤하신 상태인 거 같습니다. 휴식을 취해보세요. 🌿"}
                     </p>
                   </div>
                 </>
               )}
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Vital Metrics Summary Section (Elderly Friendly) */}
        <div className="space-y-6">
           <h2 className="text-2xl font-black text-gray-900 tracking-tight px-1 mt-6">건강 지표 상세 요약</h2>
           <div className="grid grid-cols-1 gap-6">
              {/* Average BPM Card */}
              <div className="bg-white rounded-[48px] p-10 shadow-premium border border-gray-100 flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                    <Activity size={32} className="text-primary" />
                 </div>
                 <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-3">평균 맥박 수치</p>
                 <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-6xl font-black text-gray-900 tracking-tighter">
                       {(() => {
                         const bpm = viewType === 'compare' ? Math.round(actualData?.bpm || 72) : Math.round(chartData.reduce((acc, d) => acc + (d.bpm || 72), 0) / (chartData.length || 1));
                         return bpm;
                       })()}
                    </span>
                    <span className="text-2xl font-bold text-gray-300">BPM</span>
                 </div>
                 <div className="bg-blue-50/50 px-6 py-4 rounded-3xl w-full">
                    <p className="text-[17px] text-primary font-bold leading-relaxed">
                       {(() => {
                         const bpm = viewType === 'compare' ? Math.round(actualData?.bpm || 72) : Math.round(chartData.reduce((acc, d) => acc + (d.bpm || 72), 0) / (chartData.length || 1));
                         if (bpm < 60) return "맥박이 조금 낮은 편이지만 안정적입니다. 편안히 휴식 중이신가요?";
                         if (bpm <= 100) return "맥박이 아주 고르고 안정적입니다. 심장이 건강하게 뛰고 계시네요.";
                         return "맥박이 조금 빠른 편입니다. 편안한 마음으로 심호흡을 한번 해보세요.";
                       })()}
                    </p>
                 </div>
              </div>

              {/* Average HRV Card */}
              <div className="bg-white rounded-[48px] p-10 shadow-premium border border-gray-100 flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                    <TrendingUp size={32} className="text-emerald-500" />
                 </div>
                 <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-3">평균 신체 회복력</p>
                 <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-6xl font-black text-gray-900 tracking-tighter">
                       {(() => {
                         const hrv = viewType === 'compare' ? Math.round(actualData?.hrv_ms || 42) : Math.round(chartData.reduce((acc, d) => acc + d.hrv, 0) / (chartData.length || 1));
                         return hrv;
                       })()}
                    </span>
                    <span className="text-2xl font-bold text-gray-300">ms</span>
                 </div>
                 <div className="bg-emerald-50/50 px-6 py-4 rounded-3xl w-full">
                    <p className="text-[17px] text-emerald-600 font-bold leading-relaxed">
                       {(() => {
                         const hrv = viewType === 'compare' ? Math.round(actualData?.hrv_ms || 42) : Math.round(chartData.reduce((acc, d) => acc + d.hrv, 0) / (chartData.length || 1));
                         if (hrv < 25) return "오늘은 몸이 조금 지치신 것 같아요. 무리하지 마시고 푹 쉬는 것이 좋습니다.";
                         if (hrv <= 50) return "몸의 활력이 보통 수준입니다. 가벼운 스트레칭으로 기운을 북돋아 보세요.";
                         return "신체 회복력이 아주 훌륭합니다! 오늘 하루 아주 활기차게 보내실 수 있겠어요.";
                       })()}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Treatment Activity Navigation */}
        <div className="pb-10 pt-4">
           <button 
             onClick={() => router.push('/therapies')}
             className="w-full bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all font-sans"
           >
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center">
                    <Sun size={24} className="text-primary" />
                 </div>
                 <div className="text-left">
                    <h3 className="text-lg font-black text-gray-900">치료 활동 로그</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">나의 일일 활동 기록 확인하기</p>
                 </div>
              </div>
              <ChevronRight size={24} className="text-gray-300 group-hover:translate-x-1 group-hover:text-primary transition-all" />
           </button>
        </div>
      </section>

      {/* Persistent CTA Button */}
      <div className="fixed bottom-8 left-0 right-0 px-6 z-40 max-w-md mx-auto">
         <motion.button
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={() => router.push('/')}
           className="w-full py-6 bg-gray-900 text-white rounded-[28px] font-black text-lg shadow-premium flex items-center justify-center gap-3"
         >
           <Sparkles size={22} className="text-primary" />
           <span>다시 측정하기</span>
         </motion.button>
      </div>
    </div>
  );
}

function ActivityItem({ icon, title, time, desc }: { icon: React.ReactNode, title: string, time: string, desc: string }) {
  return (
    <div className="flex items-center gap-5 p-5 hover:bg-gray-50/50 rounded-[32px] transition-all group border border-transparent hover:border-gray-100">
       <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors shadow-sm">
          {icon}
       </div>
       <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
             <h4 className="font-bold text-gray-800 text-[16px]">{title}</h4>
             <span className="text-[11px] font-black text-primary/40 uppercase">{time}</span>
          </div>
          <p className="text-[13px] text-gray-400 font-medium leading-tight">{desc}</p>
       </div>
    </div>
  );
}
