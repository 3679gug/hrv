'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, Volume2, VolumeX, MessageCircle, Heart, TrendingUp, Sparkles, Plus, Star, MapPin, Trash2, Check, ChevronRight, ChevronLeft, Phone, ClipboardList, Send, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Choice {
  emoji: string;
  label: string;
  text: string;
}

interface Session {
  id: number;
  title: string;
  time: string;
  hour: number;
  summary: string;
  fullText?: string;
  moodScore: number | null;
  activity: string;
  moodLabel?: string;
  isScheduled?: boolean;
  status?: string;
  dateKey: string;
}

interface GratitudeEntry {
  id: number;
  date: string;
  text: string;
  stars: number;
  location: string;
  theme?: string;
}

interface ScheduledActivity {
  id: number;
  name: string;
  emoji: string;
  scheduledTime: string;
  dateKey: string;
  satisfaction: number | null;
}

const ACTIVITY_BANK = [
  { name: '산책' }, { name: '독서' },
  { name: '음악감상' }, { name: '요리' },
  { name: '스트레칭' }, { name: '일기쓰기' },
  { name: '영화감상' }, { name: '친구연락' },
  { name: '명상' }, { name: '그림그리기' },
];

export default function TherapyPage() {
  const router = useRouter();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [suggestedChoices, setSuggestedChoices] = useState<Choice[]>([]);
  const [activeTab, setActiveTab] = useState<'therapy' | 'record' | 'activity' | 'gratitude'>('therapy');

  // Data States
  const [userRecords, setUserRecords] = useState<Session[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]);

  // UI States
  const [ledgerWeek, setLedgerWeek] = useState(1);
  const [gratitudeInput, setGratitudeInput] = useState('');
  const [gratitudeStars, setGratitudeStars] = useState(0);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);
  const [currentSatisfactionId, setCurrentSatisfactionId] = useState<number | null>(null);
  const [satisfactionScore, setSatisfactionScore] = useState(5);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'evening'>('morning');
  const [ledgerDay, setLedgerDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0:월, 1:화 ... 6:일

  // Session Detail Modal States
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<Session | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002';

  const getDateKey = (date: Date | number | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const getProgramStart = (sessions: Session[]) => {
    const firstDate = sessions.length > 0 ? new Date(sessions[sessions.length - 1].id) : new Date();
    const dow = firstDate.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    firstDate.setDate(firstDate.getDate() + diff);
    firstDate.setHours(0, 0, 0, 0);
    return firstDate;
  };

  useEffect(() => {
    const loadFromBrowser = () => {
      const sessions = JSON.parse(localStorage.getItem('hrv_sessions') || '[]');
      const gratitude = JSON.parse(localStorage.getItem('gratitude_entries') || '[]');
      const scheduled = JSON.parse(localStorage.getItem('scheduled_activities') || '[]');
      setUserRecords(sessions);
      setGratitudeEntries(gratitude);
      setScheduledActivities(scheduled);
    };

    const loadFromServer = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/get_data`);
        if (!res.ok) throw new Error('API Not Found');
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          Object.keys(data).forEach(key => {
            const val = data[key];
            if (val) {
              const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
              localStorage.setItem(key, stringVal);
            }
          });
          console.log('[Sync] 서버 데이터 적용 완료');
        }
      } catch (e) {
        console.warn('[Sync] 서버 연결 실패, 기존 데이터 유지');
      } finally {
        loadFromBrowser();
      }
    };

    loadFromServer();
    window.addEventListener('storage', loadFromBrowser);
    return () => window.removeEventListener('storage', loadFromBrowser);
  }, []);

  const syncData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const playAudio = (base64: string) => {
    if (!isVoiceEnabled || !base64) return;
    stopAudio();
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audioRef.current = audio;
    audio.play().catch(e => console.warn('[TTS] 재생 실패', e));
  };

  const startSession = () => {
    setSessionStarted(true);
    
    // 전날 활동 기록 요약 생성
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDateKey(yesterday);
    const yesterdaySessions = userRecords.filter(s => s.dateKey === yKey);
    const activities = yesterdaySessions.map(s => s.activity).filter(Boolean).join(', ');
    const summaryContext = activities ? `사용자가 어제 수행한 활동: ${activities}` : '어제 특별한 활동 기록 없음';

    sendMessage('안녕하세요, 상담을 시작하고 싶어요.', summaryContext);
  };

  const sendMessage = async (text: string, summaryContext?: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);
    setSuggestedChoices([]);

    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          summary_context: summaryContext 
        }),
      });

      if (!res.ok) throw new Error('서버 응답 오류');

      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      setSuggestedChoices(data.suggested_choices || []);

      if (data.audio_base64) {
        playAudio(data.audio_base64);
      }
    } catch (error) {
      console.error('채팅 오류:', error);
      setMessages([...newMessages, { role: 'assistant', content: "죄송해요, 연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestedChoices]);

  const completeActivity = (id: number) => {
    setCurrentSatisfactionId(id);
    setShowSatisfactionModal(true);
  };

  const handleSaveSatisfaction = () => {
    if (currentSatisfactionId === null) return;

    const updatedScheduled = scheduledActivities.map(a =>
      a.id === currentSatisfactionId ? { ...a, satisfaction: satisfactionScore } : a
    );
    setScheduledActivities(updatedScheduled);
    syncData('scheduled_activities', updatedScheduled);

    const target = scheduledActivities.find(x => x.id === currentSatisfactionId);
    if (target) {
      const newSession: Session = {
        id: Date.now(),
        title: '활동 완료',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        hour: new Date().getHours(),
        summary: `${target.name} 완료`,
        activity: target.name,
        moodScore: satisfactionScore,
        dateKey: getDateKey(new Date()),
      };
      const updatedSessions = [newSession, ...userRecords];
      setUserRecords(updatedSessions);
      syncData('hrv_sessions', updatedSessions);
    }

    setShowSatisfactionModal(false);
    setCurrentSatisfactionId(null);
  };

  // --- RecordView ---
  const RecordView = () => {
    const ACTIVITY_SLOTS = [
      { label: '오전', start: 6, end: 12 },
      { label: '오후', start: 12, end: 18 },
      { label: '저녁', start: 18, end: 24 },
    ];

    const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];

    const progStart = getProgramStart(userRecords);
    const weekStart = new Date(progStart);
    weekStart.setDate(progStart.getDate() + (ledgerWeek - 1) * 7);
    
    // 선택된 날짜
    const selectedDate = new Date(weekStart);
    selectedDate.setDate(weekStart.getDate() + ledgerDay);
    const dateStr = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}`;
    const dayName = DAYS_KO[ledgerDay];

    const getSessionForHour = (hour: number) => {
      const key = getDateKey(selectedDate);
      return userRecords.find(s => s.dateKey === key && s.hour === hour);
    };

    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 bg-[#F8FAFC] pb-32">
        {/* 상단 주차 및 요일 선택 */}
        <div className="bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
          <div className="flex justify-between items-center px-4">
            <button onClick={() => setLedgerWeek(prev => Math.max(1, prev - 1))} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="text-xl font-black text-gray-900">{ledgerWeek}주차</span>
            <button onClick={() => setLedgerWeek(prev => prev + 1)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex justify-between items-center px-1">
            {DAYS_KO.map((day, i) => (
              <button
                key={i}
                onClick={() => setLedgerDay(i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${i === ledgerDay ? 'bg-[#EAB308] text-white shadow-[0_4px_12px_rgba(234,179,8,0.3)]' : 'text-[#854d0e] bg-[#FEF9C3] hover:bg-[#FEF08A]'} active:scale-90`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* 활동 기록 테이블 */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                  <th rowSpan={2} className="py-4 border-r border-gray-200 w-16">시간대</th>
                  <th rowSpan={2} className="py-4 border-r border-gray-200 w-16">구분</th>
                  <th colSpan={2} className="py-2 bg-white text-gray-900 border-b border-gray-100">
                    <span className="font-black">{dateStr}</span> {dayName}요일
                  </th>
                </tr>
                <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                  <th className="py-2 border-r border-gray-200">활동</th>
                  <th className="py-2">기분</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_SLOTS.map((slot, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {Array.from({ length: slot.end - slot.start }).map((_, hIdx) => {
                      const hour = slot.start + hIdx;
                      const session = getSessionForHour(hour);
                      return (
                        <tr key={hIdx} className="border-b border-gray-100 last:border-0 h-10">
                          {hIdx === 0 && (
                            <td rowSpan={slot.end - slot.start} className="bg-gray-50 text-center font-black text-gray-900 border-r border-gray-200">
                              {slot.label}
                            </td>
                          )}
                          <td className="text-center text-gray-400 border-r border-gray-100">
                            {hour}~{hour + 1}시
                          </td>
                          <td className={`px-4 font-bold text-gray-600 ${session ? 'bg-[#FEF9C3]' : ''}`}>
                            {session?.activity || ''}
                          </td>
                          <td className={`text-center font-black text-[#6366F1] ${session ? 'bg-[#FEF9C3]' : ''}`}>
                            {session ? Number(session.moodScore).toFixed(0) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 상세 기록 카드 섹션 */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              const morningSession = userRecords.find(s => s.dateKey === getDateKey(selectedDate) && s.hour < 12 && (s.title.includes('아침') || s.title.includes('상담')));
              setSelectedDetailSession(morningSession || null);
              setShowSessionModal(true);
            }}
            className="bg-white rounded-[40px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-3 active:scale-95 transition-all text-left"
          >
            <div className="w-12 h-12 bg-[#FEF9C3] rounded-full mx-auto" />
            <div className="text-center">
              <h4 className="font-black text-gray-900 text-sm">아침 세션 상세 기록</h4>
              <p className="text-[10px] font-bold text-gray-400">오전 기록 조회</p>
            </div>
          </button>
          
          <button 
            onClick={() => {
              const eveningSession = userRecords.find(s => s.dateKey === getDateKey(selectedDate) && s.hour >= 18 && (s.title.includes('저녁') || s.title.includes('회고')));
              setSelectedDetailSession(eveningSession || null);
              setShowSessionModal(true);
            }}
            className="bg-white rounded-[40px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-3 active:scale-95 transition-all text-left"
          >
            <div className="w-12 h-12 bg-[#FEF9C3] rounded-full mx-auto" />
            <div className="text-center">
              <h4 className="font-black text-gray-900 text-sm">저녁 세션 상세 기록</h4>
              <p className="text-[10px] font-bold text-gray-400">저녁 회고 조회</p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  // --- ActivityView ---
  const ActivityView = () => {
    const validScores = userRecords.filter(s => s.moodScore !== null).map(s => Number(s.moodScore));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

    const goodCount = userRecords.filter(s => s.moodScore !== null && Number(s.moodScore) >= 7).length;
    const neutralCount = userRecords.filter(s => s.moodScore !== null && Number(s.moodScore) >= 4 && Number(s.moodScore) < 7).length;
    const badCount = userRecords.filter(s => s.moodScore !== null && Number(s.moodScore) < 4).length;

    const progStart = getProgramStart(userRecords);
    const weekStart = new Date(progStart);
    weekStart.setDate(progStart.getDate() + (ledgerWeek - 1) * 7);

    const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = getDateKey(d);
      const dayScores = userRecords.filter(s => s.dateKey === key && s.moodScore !== null).map(s => Number(s.moodScore));
      const dayAvg = dayScores.length > 0 ? (dayScores.reduce((a, b) => a + b, 0) / dayScores.length) : null;
      return { date: d, avg: dayAvg };
    });

    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 bg-[#F8FAFC] pb-32">
        {/* 평균 기분 점수 카드 */}
        <div className="bg-white rounded-[40px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-6">
          <div className="relative w-48 h-24 mx-auto">
            <svg viewBox="0 0 100 55" className="w-full h-full">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F1F5F9" strokeWidth="10" strokeLinecap="round" />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: avgScore / 10 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#EAB308" strokeWidth="10" strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span className="text-xs font-black text-[#94A3B8] mb-1">선택한 기간의 평균 기분 점수</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-[#475569] tracking-tighter">{avgScore.toFixed(1)}</span>
                <span className="text-xl font-black text-[#CBD5E1]">/10</span>
              </div>
            </div>
          </div>
          <p className="text-sm font-bold text-[#94A3B8]">활동 기록 기반 데이터가 부족합니다.</p>
          
          <div className="h-px bg-[#F1F5F9] w-full" />

          {/* 기분 통계 요약 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#FEF9C3] rounded-full mx-auto" />
              <div className="text-[11px] font-black text-[#94A3B8]">좋음</div>
              <div className="text-xl font-black text-[#475569]">{goodCount}</div>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#F1F5F9] rounded-full mx-auto" />
              <div className="text-[11px] font-black text-[#94A3B8]">보통</div>
              <div className="text-xl font-black text-[#475569]">{neutralCount}</div>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#F1F5F9] rounded-full mx-auto" />
              <div className="text-[11px] font-black text-[#94A3B8]">나쁨</div>
              <div className="text-xl font-black text-[#475569]">{badCount}</div>
            </div>
          </div>
        </div>

        {/* 기분 기록 달력 */}
        <div className="bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-[#475569] text-xl">기분 기록</h3>
            <div className="flex items-center gap-6">
              <button onClick={() => setLedgerWeek(prev => Math.max(1, prev - 1))}><ChevronLeft size={20} className="text-[#CBD5E1]" /></button>
              <span className="text-sm font-black text-[#6366F1] underline underline-offset-4">{ledgerWeek}주차</span>
              <button onClick={() => setLedgerWeek(prev => prev + 1)}><ChevronRight size={20} className="text-[#CBD5E1]" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <span className="text-[11px] font-black text-[#94A3B8]">{['월', '화', '수', '목', '금', '토', '일'][i]}</span>
                <span className="text-[10px] font-black text-[#CBD5E1]">N/A</span>
                <div className={`w-10 h-10 rounded-full transition-all ${day.avg ? 'bg-[#FEF9C3]' : 'bg-[#F1F5F9]'}`} />
                <span className="text-[10px] font-black text-[#CBD5E1]">{day.date.getMonth() + 1}/{day.date.getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 활동 일정 관리 */}
        <div className="bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-[#475569] text-xl">활동 일정 관리</h3>
            <button className="text-xs font-black text-[#94A3B8] border border-[#F1F5F9] px-4 py-2 rounded-xl">관리</button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 px-2">
            {ACTIVITY_BANK.map((act, i) => (
              <button key={i} className="px-6 py-3 bg-[#EEF2FF] rounded-[24px] text-xs font-black text-[#6366F1] hover:bg-[#FEF9C3] hover:text-[#EAB308] transition-all">
                {act.name}
              </button>
            ))}
            <button className="px-8 py-3 bg-white border-2 border-dashed border-[#6366F1] rounded-[24px] text-[13px] font-black text-[#6366F1] active:scale-95 transition-all">
              + 추가
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- GratitudeView ---
  const GratitudeView = () => {
    const handleSaveGratitude = () => {
      if (!gratitudeInput.trim()) return;
      const newEntry: GratitudeEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        text: gratitudeInput,
        stars: gratitudeStars,
        location: '오늘의 위치',
      };
      const updated = [newEntry, ...gratitudeEntries];
      setGratitudeEntries(updated);
      syncData('gratitude_entries', updated);
      setGratitudeInput('');
      setGratitudeStars(0);
    };

    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 bg-white pb-32">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">감사 일기</h2>
          <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
        </div>

        <div className="bg-white rounded-[40px] p-8 border-2 border-primary/20 shadow-sm space-y-6">
          <div className="space-y-4">
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder="오늘 감사했던 따뜻한 순간을 적어보세요..."
              className="w-full h-32 bg-gray-50 border-none rounded-[32px] p-6 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setGratitudeStars(star)}>
                    <Star size={24} className={star <= gratitudeStars ? 'text-amber-400 fill-current ml-1' : 'text-gray-200 ml-1'} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-primary-dark flex items-center gap-1"><MapPin size={10} /> 평화로운 일상</span>
                <button onClick={handleSaveGratitude} className="bg-primary text-gray-900 px-6 py-3 rounded-full font-black text-sm active:scale-95 transition-all">저장</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            {gratitudeEntries.map((e, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative group overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="px-3 py-1 bg-secondary text-primary-dark text-[10px] font-black rounded-lg">{e.date} · {e.location}</div>
                  <div className="flex gap-0.5">
                    {[...Array(e.stars)].map((_, j) => <Star key={j} size={12} className="text-amber-400 fill-current" />)}
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-600 leading-relaxed">"{e.text}"</p>
                <button className="absolute bottom-4 right-4 text-gray-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            ))}
            {gratitudeEntries.length === 0 && (
              <p className="text-gray-300 font-bold text-center py-10">첫 번째 감사 일기를 작성해 보세요!</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 max-w-md mx-auto flex flex-col font-sans relative overflow-hidden">
      {!sessionStarted ? (
        <>
          {/* 세션 선택 탭 - 활동(therapy) 탭에서만 노출 */}
          {activeTab === 'therapy' && (
            <div className="px-6 pt-10 pb-6 flex justify-center sticky top-0 bg-white/80 backdrop-blur-md z-30">
              <div className="bg-secondary rounded-[28px] p-2 flex w-full shadow-inner border-2 border-primary/20 font-bold">
                <button
                  onClick={() => setSelectedSession('morning')}
                  className={`flex-1 py-4 rounded-[22px] font-black text-lg flex items-center justify-center gap-2 transition-all ${selectedSession === 'morning' ? 'bg-white text-gray-900 shadow-sm border border-primary/10' : 'text-gray-400'}`}
                >
                  아침 세션
                </button>
                <button
                  onClick={() => setSelectedSession('evening')}
                  className={`flex-1 py-4 rounded-[22px] font-black text-lg flex items-center justify-center gap-2 transition-all ${selectedSession === 'evening' ? 'bg-white text-gray-900 shadow-sm border border-primary/10' : 'text-gray-400'}`}
                >
                  저녁 세션
                </button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'therapy' && (
              <motion.section
                key="therapy-home"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-start gap-10 pt-10 pb-32"
              >
                <div className="flex flex-col items-center">
                  <div className="w-80 h-48 flex items-center justify-center -mb-4">
                    <Image src="/maeum_logo_final.png" alt="마음이음 로고" width={320} height={160} className="object-contain" priority />
                  </div>
                </div>
                <div className="text-center space-y-4 px-8">
                  <h2 className="text-4xl font-black text-gray-900 leading-[1.1] tracking-tighter">마음이음과<br />대화하기</h2>
                  <p className="text-xl text-gray-900/60 font-bold leading-relaxed px-4">어르신의 마음을 따뜻하게<br />들어주는 대화가 준비되었습니다.</p>
                </div>
                <footer className="px-6 py-10 w-full mt-auto">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startSession}
                    className="w-full relative overflow-hidden group bg-primary rounded-[50px] p-8 active:scale-[0.98] transition-all text-left flex items-center justify-between border-8 border-white/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-gray-900/40 text-[10px] font-black tracking-widest uppercase mb-1">CALL START</span>
                      <span className="text-3xl font-black text-gray-900 tracking-tighter">통화 시작하기</span>
                    </div>
                    <div className="bg-white p-4 rounded-full shadow-xl group-hover:translate-x-1 transition-transform">
                      <Phone size={24} className="text-gray-900" />
                    </div>
                  </motion.button>
                </footer>
              </motion.section>
            )}

            {activeTab === 'record' && (
              <motion.div key="record-view" className="flex-1 flex flex-col pt-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <RecordView />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div key="activity-view" className="flex-1 flex flex-col pt-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ActivityView />
              </motion.div>
            )}

            {activeTab === 'gratitude' && (
              <motion.div key="gratitude-view" className="flex-1 flex flex-col pt-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GratitudeView />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 하단 네비게이션 */}
          <div className="bg-white/95 backdrop-blur-2xl border-t border-gray-100 h-24 flex justify-around items-center px-10 z-[60] fixed bottom-0 max-w-md w-full">
            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => router.push('/')}>
              <Home size={24} className="text-gray-400 group-hover:text-gray-900" />
              <span className="text-[10px] font-black text-gray-400">홈</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('therapy')}>
              <div className={`p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] -mt-10 border-4 border-white transition-all ${activeTab === 'therapy' ? 'bg-[#94A3B8]' : 'bg-[#F1F5F9]'}`}>
                <MessageCircle size={28} className={activeTab === 'therapy' ? 'text-white' : 'text-[#94A3B8]'} />
              </div>
              <span className={`text-[10px] font-black ${activeTab === 'therapy' ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>활동</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('record')}>
              <ClipboardList size={24} className={activeTab === 'record' ? 'text-[#64748B]' : 'text-[#94A3B8]'} />
              <span className={`text-[10px] font-black ${activeTab === 'record' ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>기특</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('activity')}>
              <TrendingUp size={24} className={activeTab === 'activity' ? 'text-[#EAB308]' : 'text-[#94A3B8]'} />
              <span className={`text-[10px] font-black ${activeTab === 'activity' ? 'text-gray-900' : 'text-[#94A3B8]'}`}>자기관리</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('gratitude')}>
              <Heart size={24} className={activeTab === 'gratitude' ? 'text-[#64748B]' : 'text-[#94A3B8]'} fill={activeTab === 'gratitude' ? 'currentColor' : 'none'} />
              <span className={`text-[10px] font-black ${activeTab === 'gratitude' ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>감사일기</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col h-full">
          <header className="flex justify-between items-center py-6 px-8 sticky top-0 bg-white/80 backdrop-blur-md z-30">
            <button onClick={() => setSessionStarted(false)} className="flex items-center justify-center w-12 h-12 bg-transparent active:scale-95 transition-all">
              <ChevronLeft size={32} className="text-gray-900" strokeWidth={3} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black tracking-tight">마음이음</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-black text-green-600 uppercase tracking-widest">Connected</span>
              </div>
            </div>
            <button
              onClick={() => {
                const newState = !isVoiceEnabled;
                setIsVoiceEnabled(newState);
                if (!newState) stopAudio();
              }}
              className={`p-4 rounded-[24px] transition-all ${isVoiceEnabled ? 'bg-primary text-gray-900' : 'bg-white text-gray-300 border border-gray-100'}`}
            >
              {isVoiceEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-10 py-10 bg-white scroll-smooth pb-52">
            <AnimatePresence initial={false}>
              {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-8 rounded-[40px] text-[1.5rem] font-black leading-[1.6] ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-primary text-gray-900 rounded-tl-none border-4 border-white/50'}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 p-6 rounded-[32px] flex items-center gap-4 shadow-sm">
                    <Sparkles size={24} className="animate-spin text-gray-400" />
                    <span className="font-black text-gray-400 text-lg">듣고 있어요...</span>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <footer className="bg-white/90 backdrop-blur-xl p-4 border-t border-gray-100 z-20 absolute bottom-0 left-0 right-0 flex flex-col gap-3 pb-8">
            {suggestedChoices && suggestedChoices.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                {suggestedChoices.map((choice, i) => (
                  <button 
                    key={i} 
                    onClick={() => sendMessage(choice.text)}
                    className="flex-shrink-0 bg-[#FEF9C3] text-[#854d0e] px-5 py-3 rounded-[20px] font-bold text-sm shadow-sm active:scale-95 transition-transform border border-[#FEF9C3]"
                  >
                    {choice.label || choice.text}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSessionStarted(false)} 
                className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm active:scale-90 transition-transform"
                title="상담 종료"
              >
                <Phone size={20} className="rotate-[135deg]" />
              </button>
              
              <div className="flex-1 bg-gray-50 rounded-full flex items-center px-4 py-2 border border-gray-200">
                <input 
                  type="text" 
                  id="chatInput"
                  placeholder="메시지를 입력하세요..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder-gray-400 py-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    const input = document.getElementById('chatInput') as HTMLInputElement;
                    if (input && input.value) {
                      sendMessage(input.value);
                      input.value = '';
                    }
                  }}
                  className="w-8 h-8 bg-[#FEF9C3] rounded-full flex items-center justify-center text-[#854d0e] ml-2"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 만족도 모달 */}
      <AnimatePresence>
        {showSatisfactionModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[48px] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">활동 완료!</h3>
              <p className="text-sm font-bold text-gray-400 mb-8">활동 후 기분은 어떠신가요?</p>
              <div className="space-y-6 mb-10">
                <div className="flex justify-between text-[10px] font-black text-gray-300 uppercase tracking-widest px-2">
                  <span>Worst</span>
                  <span>Great</span>
                </div>
                <input type="range" min="0" max="10" step="1" value={satisfactionScore} onChange={(e) => setSatisfactionScore(parseInt(e.target.value))} className="w-full accent-primary" />
                <div className="text-6xl font-black text-gray-900 tracking-tighter">{satisfactionScore}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSatisfactionModal(false)} className="flex-1 py-4 font-black text-gray-400">취소</button>
                <button onClick={handleSaveSatisfaction} className="flex-1 py-4 bg-primary rounded-3xl font-black text-gray-900 shadow-lg">점수 저장</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 세션 상세 모달 */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 50, opacity: 0 }} 
              className="bg-[#F8FAFC] rounded-[48px] w-full max-w-sm h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <header className="p-8 bg-white border-b border-gray-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-gray-900">{selectedDetailSession?.title || '세션 기록'}</h3>
                  <p className="text-xs font-bold text-gray-400">{selectedDetailSession?.time || '시간 정보 없음'}</p>
                </div>
                <button onClick={() => setShowSessionModal(false)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedDetailSession ? (
                  <>
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-2">
                      <span className="text-[10px] font-black text-[#6366F1] uppercase tracking-widest">Summary</span>
                      <p className="text-sm font-bold text-gray-600 leading-relaxed">{selectedDetailSession.summary}</p>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Dialogue</span>
                      {selectedDetailSession.fullText ? (
                        selectedDetailSession.fullText.split('\n').filter(line => line.trim()).map((line, idx) => {
                          const isAI = line.startsWith('앨리:') || line.startsWith('마음이음:');
                          const content = line.includes(':') ? line.split(':')[1].trim() : line;
                          return (
                            <div key={idx} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold leading-relaxed ${isAI ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' : 'bg-gray-900 text-white rounded-tr-none'}`}>
                                {content}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-20">
                          <p className="text-sm font-bold text-gray-300">상세 대화 기록이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-20 px-8">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                      <TrendingUp size={32} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">기록된 데이터가 없어요</h4>
                      <p className="text-xs font-bold text-gray-400 mt-1 leading-relaxed">선택하신 날짜에 상담 세션을 진행하시면 여기에 기록이 나타납니다.</p>
                    </div>
                  </div>
                )}
              </div>

              <footer className="p-8 bg-white border-t border-gray-100">
                <button onClick={() => setShowSessionModal(false)} className="w-full py-5 bg-[#FEF9C3] rounded-3xl font-black text-[#854d0e] shadow-lg active:scale-[0.98] transition-all">
                  닫기
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
