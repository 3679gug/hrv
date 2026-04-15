'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Activity, TrendingUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportDataItem {
  label: string;
  phq9: number;
  hrv: number;
  bpm: number;
  stress_index?: number;
}

const generateMockData = (type: 'daily' | 'weekly' | 'monthly' | 'yearly'): ReportDataItem[] => {
  const data: ReportDataItem[] = [];
  if (type === 'daily') {
    [8, 11, 14, 17, 20, 23].forEach(h => {
      data.push({ label: `${h}시`, phq9: Math.floor(Math.random() * 10) + 5, hrv: Math.floor(Math.random() * 20) + 40, bpm: Math.floor(Math.random() * 15) + 65 });
    });
  } else if (type === 'weekly') {
    ['월', '화', '수', '목', '금', '토', '일'].forEach(d => {
      data.push({ label: d, phq9: Math.floor(Math.random() * 15) + 3, hrv: Math.floor(Math.random() * 25) + 35, bpm: Math.floor(Math.random() * 20) + 65 });
    });
  } else if (type === 'monthly') {
    for (let i = 1; i <= 30; i += 5) {
      data.push({ label: `${i}일`, phq9: Math.floor(Math.random() * 15) + 5, hrv: Math.floor(Math.random() * 25) + 35, bpm: Math.floor(Math.random() * 20) + 65 });
    }
  } else {
    ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'].forEach(m => {
      data.push({ label: m, phq9: Math.floor(Math.random() * 20) + 2, hrv: Math.floor(Math.random() * 30) + 30, bpm: Math.floor(Math.random() * 20) + 65 });
    });
  }
  return data;
};

const TrendChart = ({ data, colors, showPhq9 = false }: { data: ReportDataItem[], colors: { phq9: string, hrv: string }, showPhq9?: boolean }) => {
  const width = 400; const height = 200; const padding = 40;
  const getY = (val: number, max: number) => height - padding - (val / max) * (height - 2 * padding);
  const getX = (idx: number) => padding + (idx / (data.length - 1)) * (width - 2 * padding);
  const phq9Points = data.map((d, i) => `${getX(i)},${getY(d.phq9, 30)}`).join(' ');
  const hrvPoints = data.map((d, i) => `${getX(i)},${getY(d.hrv, 100)}`).join(' ');
  return (
    <div className="w-full bg-gray-50 rounded-[28px] p-3 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />
        {[0, 50, 100].map(val => (
          <text key={val} x={padding - 8} y={getY(val, 100) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{val}</text>
        ))}
        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={height - padding + 16} fontSize="10" fill="#64748b" textAnchor="middle">{d.label}</text>
        ))}
        {showPhq9 && (
          <>
            <motion.polyline initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2 }}
              fill="none" stroke={colors.phq9} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={phq9Points} />
            {data.map((d, i) => (
              <motion.circle key={`p-${i}`} cx={getX(i)} cy={getY(d.phq9, 30)} r="5" fill="white" stroke={colors.phq9} strokeWidth="3"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.08 }} />
            ))}
          </>
        )}
        <motion.polyline initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }}
          fill="none" stroke={colors.hrv} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={hrvPoints} />
        {data.map((d, i) => (
          <motion.circle key={`h-${i}`} cx={getX(i)} cy={getY(d.hrv, 100)} r="5" fill="white" stroke={colors.hrv} strokeWidth="3"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 + i * 0.08 }} />
        ))}
      </svg>
    </div>
  );
};

export default function ReportsPage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<'today' | 'weekly' | 'monthly' | 'yearly'>('today');
  const [chartData, setChartData] = useState<ReportDataItem[]>([]);
  const [actualData, setActualData] = useState<any>(null);
  const colors = { phq9: '#f97316', hrv: '#2dd4bf' };
  const showPhq9 = viewType === 'monthly' || viewType === 'yearly';

  useEffect(() => {
    try { const s = localStorage.getItem('hrv_result'); if (s) setActualData(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    const t = viewType === 'today' ? 'daily' : viewType;
    setChartData(generateMockData(t));
    localStorage.setItem('has_done_action', 'true');
  }, [viewType]);

  const tabs = [
    { key: 'today', label: '오늘' },
    { key: 'weekly', label: '이번 주' },
    { key: 'monthly', label: '이번 달' },
    { key: 'yearly', label: '올해' },
  ] as const;

  const bpm = viewType === 'today'
    ? Math.round(actualData?.bpm || 72)
    : Math.round(chartData.reduce((a, d) => a + (d.bpm || 72), 0) / (chartData.length || 1));
  const hrv = viewType === 'today'
    ? Math.round(actualData?.hrv_ms || 42)
    : Math.round(chartData.reduce((a, d) => a + d.hrv, 0) / (chartData.length || 1));

  const bpmGood = bpm >= 60 && bpm <= 100;
  const bpmMsg = bpm < 60
    ? '맥박이 조금 낮은 편입니다. 전문가 상담을 받아보시는 게 좋겠어요.'
    : bpm <= 100
    ? '맥박이 아주 고르고 안정적입니다. 심장이 건강하게 뛰고 계시네요.'
    : '맥박이 조금 빠른 편입니다. 편안한 마음으로 심호흡을 한번 해보세요.';

  const hrvGood = hrv > 50;
  const hrvBad = hrv < 25;
  const hrvMsg = hrv < 25
    ? '심박변이도가 낮습니다. 충분한 휴식을 통해 신체 에너지를 회복해 보세요.'
    : hrv <= 50
    ? '심박변이도가 보통 수준입니다. 가벼운 활동이 활력을 높이는 데 큰 도움이 됩니다.'
    : '심박변이도가 아주 훌륭합니다! 오늘 하루 아주 활기차게 보내실 수 있겠어요.';

  return (
    <main>
      <div className="h-full w-full bg-white flex flex-col font-sans relative">
        {/* 상단바 */}
        <header className="absolute top-0 left-0 right-0 h-14 px-6 flex justify-between items-center border-b border-yellow-100 z-50 shadow-sm" style={{ backgroundColor: '#FFFBEB' }}>
          <button onClick={() => router.back()} className="text-gray-900/80 p-2 active:scale-95 transition-all">
            <ChevronLeft size={28} strokeWidth={3} />
          </button>
          <span className="text-lg font-black tracking-tight text-gray-900">변화 확인</span>
          <button className="p-2 text-gray-400 active:scale-95 transition-all">
            <Download size={22} />
          </button>
        </header>

        {/* 스크롤 콘텐츠 */}
        <div className="flex-1 px-5 pt-20 pb-24 overflow-y-auto scrollbar-hide space-y-5">

          {/* 탭 */}
          <div className="bg-gray-100 p-1.5 rounded-[20px] flex gap-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewType(key)}
                className={`flex-1 py-3 rounded-[16px] text-sm font-black transition-all ${
                  viewType === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 메인 콘텐츠 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewType}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {viewType === 'today' ? (
                <>
                  <p className="text-sm font-black text-gray-900 px-1">어제와 비교</p>
                  <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm min-h-[140px] flex flex-col justify-center">
                    <p className="text-base text-gray-700 font-bold leading-[1.8]">
                      {(actualData?.hrv_ms || chartData[chartData.length - 1]?.hrv || 0) >= (chartData[chartData.length - 2]?.hrv || 0)
                        ? '어제보다 더 컨디션이 좋아진 거 같습니다. 👏'
                        : '어제보다 더 피곤하신 상태인 거 같습니다. 휴식을 취해보세요. 🌿'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-sm font-black text-gray-900">
                      {showPhq9 ? '마음과 심박변이도의 변화' : '심박변이도 변화'}
                    </p>
                    <div className="flex gap-3">
                      {showPhq9 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.phq9 }} />
                          <span className="text-[10px] font-bold text-gray-400">마음</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.hrv }} />
                        <span className="text-[10px] font-bold text-gray-400">심박변이도</span>
                      </div>
                    </div>
                  </div>
                  <TrendChart data={chartData} colors={colors} showPhq9={showPhq9} />
                  <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">변화 요약</p>
                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                      {(chartData[chartData.length - 1]?.hrv || 0) >= (chartData[chartData.length - 2]?.hrv || 0)
                        ? '이전 측정보다 더 컨디션이 좋아진 거 같습니다. 👏'
                        : '이전 측정보다 더 피곤하신 상태인 거 같습니다. 휴식을 취해보세요. 🌿'}
                    </p>
                  </div>
                </>
              )}

              {/* 건강 지표 상세 요약 */}
              <p className="text-sm font-black text-gray-900 px-1 pt-2">건강 지표 상세 요약</p>

              {/* BPM 카드 */}
              <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
                    <Activity size={20} className="text-gray-900" />
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">평균 맥박 수치</p>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-5xl font-black text-gray-900 tracking-tighter">{bpm}</span>
                  <span className="text-xl font-bold text-gray-300">BPM</span>
                </div>
                <div className="bg-gray-50 px-4 py-3 rounded-[16px]">
                  <p className={`text-sm font-bold leading-relaxed ${bpmGood ? 'text-emerald-500' : 'text-red-500'}`}>
                    {bpmMsg}
                  </p>
                </div>
              </div>

              {/* HRV 카드 */}
              <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[14px] bg-emerald-50 flex items-center justify-center">
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">평균 심박변이도</p>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-5xl font-black text-gray-900 tracking-tighter">{hrv}</span>
                  <span className="text-xl font-bold text-gray-300">ms</span>
                </div>
                <div className="bg-gray-50 px-4 py-3 rounded-[16px]">
                  <p className={`text-sm font-bold leading-relaxed ${hrvGood ? 'text-emerald-500' : hrvBad ? 'text-red-500' : 'text-amber-500'}`}>
                    {hrvMsg}
                  </p>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

        {/* 하단 내비게이션 */}
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
