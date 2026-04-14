'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Volume2, VolumeX, MessageCircle, Heart, ArrowLeft, TrendingUp, Sparkles, Plus, Star, MapPin, Trash2, Check, ChevronRight, ChevronLeft, Phone } from 'lucide-react';
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
  { name: '산책', emoji: '🚶' }, { name: '독서', emoji: '📚' },
  { name: '음악감상', emoji: '🎵' }, { name: '요리', emoji: '🍳' },
  { name: '스트레칭', emoji: '🧘' }, { name: '일기쓰기', emoji: '✏️' },
  { name: '영화감상', emoji: '🎬' }, { name: '친구연락', emoji: '📱' },
  { name: '명상', emoji: '🌿' }, { name: '그림그리기', emoji: '🎨' },
];

export default function TherapyPage() {
  const router = useRouter();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [suggestedChoices, setSuggestedChoices] = useState<Choice[]>([]);
  const [activeTab, setActiveTab] = useState<'therapy' | 'record' | 'activity'>('therapy');

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
    const loadData = () => {
      const sessions = JSON.parse(localStorage.getItem('hrv_sessions') || '[]');
      const gratitude = JSON.parse(localStorage.getItem('gratitude_entries') || '[]');
      const scheduled = JSON.parse(localStorage.getItem('scheduled_activities') || '[]');
      setUserRecords(sessions);
      setGratitudeEntries(gratitude);
      setScheduledActivities(scheduled);
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
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
    sendMessage('안녕하세요, 상담을 시작하고 싶어요.');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);
    setSuggestedChoices([]);

    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
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

  // --- RecordView ---
  const RecordView = () => {
    const sortedRecords = [...userRecords].sort((a, b) => b.id - a.id);

    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 bg-white pb-32">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">활동 기록지</h2>
          <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border-2 border-primary/20 overflow-hidden">
          <table className="w-full border-collapse text-center text-[12px]">
            <thead>
              <tr className="bg-primary/30 text-gray-900 font-bold border-b-2 border-primary/20">
                <th className="py-4 px-2 border-r border-primary/10 w-20">날짜/시간</th>
                <th className="py-4 px-4 border-r border-primary/10">활동 및 상담 내용</th>
                <th className="py-4 px-2">기분</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 font-medium">
              {sortedRecords.length > 0 ? (
                sortedRecords.slice(0, 15).map((row, i) => (
                  <tr key={i} className="border-b border-primary/10 last:border-0 h-16 odd:bg-primary/5">
                    <td className="text-[10px] leading-tight font-bold text-gray-400 border-r border-primary/10 px-2">
                      {new Date(row.id).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}<br />{row.time}
                    </td>
                    <td className="text-left px-4 text-xs leading-relaxed font-bold">
                      {row.activity || row.title}
                    </td>
                    <td className="font-black text-primary-dark drop-shadow-sm px-2 text-sm">
                      {row.moodScore !== null ? Number(row.moodScore).toFixed(1) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-20 text-gray-300 font-bold">기록된 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- ActivityView ---
  const ActivityView = () => {
    const validScores = userRecords.filter(s => s.moodScore !== null).map(s => Number(s.moodScore));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

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

    const getMoodColor = (score: number | null) => {
      if (score === null) return 'bg-gray-100';
      if (score >= 8) return 'bg-emerald-400';
      if (score >= 6) return 'bg-lime-400';
      if (score >= 4) return 'bg-amber-400';
      return 'bg-rose-400';
    };

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

    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 bg-white pb-32">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">오늘의 자기관리</h2>
          <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
        </div>

        {/* 무드 게이지 */}
        <div className="bg-white rounded-[40px] p-8 border-2 border-primary/20 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-24 mb-6">
              <svg viewBox="0 0 100 55" className="w-full h-full">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F1F3F9" strokeWidth="8" strokeLinecap="round" />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: avgScore / 10 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gaugeGradient)" strokeWidth="8" strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FB7185" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.div
                className="absolute bottom-0 left-1/2 w-1.5 h-20 bg-gray-900 rounded-full origin-bottom"
                initial={{ rotate: -90 }}
                animate={{ rotate: (avgScore / 10) * 180 - 90 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ translateX: '-50%' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                <span className="text-4xl font-black text-gray-900 tracking-tighter">{avgScore.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Mood</span>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-400 text-center leading-relaxed">
              {avgScore >= 7 ? '😊 전반적으로 아주 안정적인 상태입니다.' : avgScore >= 4 ? '😐 기분 전환을 위해 오늘 추천 활동을 해보세요.' : '😔 마음이음과 더 깊은 대화가 필요한 시간이에요.'}
            </p>
          </div>
        </div>

        {/* 기분 달력 */}
        <div className="bg-white rounded-[40px] p-8 border-2 border-primary/20 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <span className="font-black text-gray-900 text-lg">기분 달력</span>
            <div className="flex items-center gap-4 bg-gray-50 px-3 py-1.5 rounded-2xl">
              <button onClick={() => setLedgerWeek(prev => Math.max(1, prev - 1))}><ChevronLeft size={16} /></button>
              <span className="text-xs font-black text-primary-dark">{ledgerWeek}주차</span>
              <button onClick={() => setLedgerWeek(prev => prev + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-gray-400">{['월', '화', '수', '목', '금', '토', '일'][i]}</span>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all ${getMoodColor(day.avg)}`}>
                  <span className="text-white font-black text-xs">{day.avg ? day.avg.toFixed(0) : ''}</span>
                </div>
                <span className="text-[9px] font-bold text-gray-300">{day.date.getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 활동 인사이트 */}
        {avgScore >= 7 && (
          <div className="bg-secondary/50 rounded-[40px] p-8 border-2 border-primary/30 flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-sm border border-primary/10">🏃</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 mb-1">나를 행복하게 만든 활동</p>
              <h4 className="font-black text-gray-900 text-lg leading-tight tracking-tighter">기분이 좋았던 날,<br />주로 <span className="text-primary-dark underline underline-offset-4">산책</span>을 하셨네요!</h4>
            </div>
          </div>
        )}

        {/* 활동 일정 관리 */}
        <div className="bg-white rounded-[40px] p-8 border-2 border-primary/20 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-gray-900 text-lg">활동 일정 관리</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACTIVITY_BANK.map((act, i) => (
              <button key={i} className="px-4 py-2.5 bg-gray-50 rounded-2xl text-xs font-bold text-gray-600 hover:bg-primary/20 active:scale-95 transition-all flex items-center gap-2">
                <span>{act.emoji}</span> {act.name}
              </button>
            ))}
            <button className="w-10 h-10 border-2 border-dashed border-primary-dark rounded-2xl flex items-center justify-center text-primary-dark"><Plus size={18} /></button>
          </div>

          <div className="space-y-3 pt-4">
            {scheduledActivities.length > 0 ? (
              scheduledActivities.map((sa, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-3xl flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">{sa.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900">{sa.name}</span>
                      {sa.satisfaction && <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-black rounded-full">{sa.satisfaction} pt</div>}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400">{sa.scheduledTime} · {sa.dateKey.split('-')[2]}일</p>
                  </div>
                  {sa.satisfaction === null ? (
                    <button onClick={() => completeActivity(sa.id)} className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95">완료</button>
                  ) : (
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500"><Check size={20} /></div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-300 font-bold text-center py-4">위에서 활동을 선택해 일정을 추가해보세요!</p>
            )}
          </div>
        </div>

        {/* 감사 일기 */}
        <div className="bg-white rounded-[40px] p-8 border-2 border-primary/20 shadow-sm space-y-6">
          <h3 className="font-black text-gray-900 text-lg">📔 감사 일기</h3>
          <div className="space-y-4">
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder="오늘 감사했던 따뜻한 순간을 적어보세요..."
              className="w-full h-32 bg-gray-50 border-none rounded-[32px] p-6 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setGratitudeStars(star)}>
                    <Star size={24} className={star <= gratitudeStars ? 'text-amber-400 fill-current' : 'text-gray-200'} />
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
          </div>
        </div>

        {/* 만족도 모달 */}
        {showSatisfactionModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[48px] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">활동 완료! 🎉</h3>
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
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 max-w-md mx-auto flex flex-col font-sans relative overflow-hidden">
      {!sessionStarted ? (
        <>
          {/* 세션 선택 탭 */}
          <div className="px-6 pt-10 pb-6 flex justify-center sticky top-0 bg-white/80 backdrop-blur-md z-30">
            <div className="bg-secondary rounded-[28px] p-2 flex w-full shadow-inner border-2 border-primary/20 font-bold">
              <button
                onClick={() => setSelectedSession('morning')}
                className={`flex-1 py-4 rounded-[22px] font-black text-lg flex items-center justify-center gap-2 transition-all ${selectedSession === 'morning' ? 'bg-white text-gray-900 shadow-sm border border-primary/10' : 'text-gray-400'}`}
              >
                <span>☀️</span> 아침 세션
              </button>
              <button
                onClick={() => setSelectedSession('evening')}
                className={`flex-1 py-4 rounded-[22px] font-black text-lg flex items-center justify-center gap-2 transition-all ${selectedSession === 'evening' ? 'bg-white text-gray-900 shadow-sm border border-primary/10' : 'text-gray-400'}`}
              >
                <span>🌙</span> 저녁 세션
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'therapy' && (
              <motion.section
                key="therapy-home"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-start gap-10 pt-10 pb-32"
              >
                <div className="relative">
                  <div className="w-56 h-56 bg-primary rounded-[70px] flex items-center justify-center shadow-2xl rotate-3 border-8 border-white/50">
                    <div className="text-8xl -rotate-3">🤖</div>
                  </div>
                  <motion.div animate={{ scale: [1, 1.4], opacity: [0.6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute inset-0 border-4 border-primary rounded-full -z-10" />
                </div>
                <div className="text-center space-y-4 px-8">
                  <h2 className="text-5xl font-black text-gray-900 leading-[1.1] tracking-tighter">마음이음과<br />대화하기</h2>
                  <p className="text-[22px] text-gray-900/60 font-bold leading-relaxed px-4">어르신의 마음을 따뜻하게<br />들어주는 대화가 준비되었습니다.</p>
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
          </AnimatePresence>

          {/* 하단 네비게이션 */}
          <div className="bg-white/95 backdrop-blur-2xl border-t border-gray-100 h-24 flex justify-around items-center px-10 z-[60] fixed bottom-0 max-w-md w-full">
            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => router.push('/')}>
              <Home size={24} className="text-gray-400 group-hover:text-gray-900" />
              <span className="text-[10px] font-black text-gray-400">홈</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('therapy')}>
              <div className={`p-4 rounded-full shadow-2xl -mt-10 border-4 border-white transition-all ${activeTab === 'therapy' ? 'bg-primary' : 'bg-gray-100'}`}>
                <MessageCircle size={28} className={activeTab === 'therapy' ? 'text-gray-900' : 'text-gray-400'} />
              </div>
              <span className={`text-[10px] font-black ${activeTab === 'therapy' ? 'text-gray-900' : 'text-gray-400'}`}>활동</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('record')}>
              <TrendingUp size={24} className={activeTab === 'record' ? 'text-primary-dark' : 'text-gray-400'} />
              <span className={`text-[10px] font-black ${activeTab === 'record' ? 'text-gray-900' : 'text-gray-400'}`}>기록</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab('activity')}>
              <Heart size={24} className={activeTab === 'activity' ? 'text-primary-dark' : 'text-gray-400'} fill={activeTab === 'activity' ? 'currentColor' : 'none'} />
              <span className={`text-[10px] font-black ${activeTab === 'activity' ? 'text-gray-900' : 'text-gray-400'}`}>자기관리</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col h-full">
          <header className="flex justify-between items-center py-6 px-8 sticky top-0 bg-white/80 backdrop-blur-md z-30">
            <button onClick={() => setSessionStarted(false)} className="p-4 rounded-[24px] bg-white shadow-sm text-gray-900 border border-gray-100 active:scale-95">
              <ArrowLeft size={28} />
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

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-10 py-10 bg-white scroll-smooth pb-40">
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

          <footer className="bg-white/90 backdrop-blur-xl p-6 border-t border-gray-100 pb-12 z-20 absolute bottom-0 left-0 right-0">
            <div className="flex justify-center py-2">
              <button onClick={() => setSessionStarted(false)} className="flex flex-col items-center gap-3 active:scale-90 transition-transform">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_12px_24px_rgba(239,68,68,0.4)] border-8 border-white">
                  <Phone size={28} className="rotate-[135deg]" />
                </div>
                <span className="font-black text-red-500 text-base uppercase tracking-widest">End Call</span>
              </button>
            </div>
          </footer>
        </div>
      )}
    </main>
  );
}
