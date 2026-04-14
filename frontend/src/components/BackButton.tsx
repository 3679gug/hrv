'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function BackButton({ onClick, className = '' }: BackButtonProps) {
  const router = useRouter();
  const handleClick = onClick || (() => router.back());

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all ${className}`}
      aria-label="뒤로가기"
    >
      <ChevronLeft size={26} className="text-white" strokeWidth={3} />
    </button>
  );
}
