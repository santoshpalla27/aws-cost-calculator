'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface QuizTimerProps {
  initialTime: number;
  onTimeout: () => void;
}

export function QuizTimer({ initialTime, onTimeout }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center text-lg font-semibold">
      <Clock className="w-5 h-5 mr-2" />
      {formatTime(timeLeft)}
    </div>
  );
}