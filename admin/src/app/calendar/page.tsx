'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { ReelConfig, TEMPLATES } from '@/services/templates';

export default function CalendarPage() {
  const [reels, setReels] = useState<ReelConfig[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    setReels(stored);
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  function getReelsForDay(day: number): ReelConfig[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reels.filter(r => r.date === dateStr);
  }

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Content Calendar</h1>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              ←
            </button>
            <span className="text-lg font-medium text-white min-w-[200px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-cosmic-card border border-cosmic-border rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-cosmic-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-medium text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="p-2 min-h-[120px] border-b border-r border-cosmic-border bg-white/[0.01]" />;
              
              const dayReels = getReelsForDay(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`p-2 min-h-[120px] border-b border-r border-cosmic-border transition-all hover:bg-white/[0.03] ${
                    isToday ? 'bg-brand-purple/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${isToday ? 'text-brand-purple font-bold' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    {dayReels.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 bg-brand-purple/20 text-brand-purple rounded-full">
                        {dayReels.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayReels.slice(0, 3).map(reel => (
                      <div
                        key={reel.id}
                        className="text-xs p-1 rounded bg-white/5 truncate text-gray-400"
                        title={`${reel.sign || 'General'} - ${TEMPLATES[reel.templateType]?.name}`}
                      >
                        {TEMPLATES[reel.templateType]?.icon} {reel.sign || 'Gen'}
                      </div>
                    ))}
                    {dayReels.length > 3 && (
                      <p className="text-xs text-gray-500">+{dayReels.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" /> Pending Review
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" /> Approved
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400" /> Exported
          </span>
        </div>
      </div>
    </AppShell>
  );
}
