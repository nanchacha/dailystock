"use client";

import { useState, useMemo } from 'react';

type NewsItem = {
    id: number;
    date: string;
    content: string;
    source: string;
};

export default function Calendar({ news }: { news: NewsItem[] }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthData = useMemo(() => {
        const data: Record<number, string[]> = {};
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        news.forEach(item => {
            const itemDate = new Date(item.date);
            if (itemDate.getFullYear() === year && itemDate.getMonth() === month) {
                // Extract top themes (up to 2)
                const emojiRegex = /<h3[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>([\s\S]*?)<span/g;
                const matches = [...item.content.matchAll(emojiRegex)];

                if (matches.length > 0) {
                    // Take up to 2 emojis
                    const emojis = matches.slice(0, 2).map(m => m[1].trim());
                    data[itemDate.getDate()] = emojis;
                } else {
                    // Fallback for old data or simple format
                    const match = item.content.match(/<h3[^>]*>([\s\S]*?)<span/);
                    if (match) {
                        let theme = match[1].trim();
                        theme = theme.replace(/\n/g, '').trim();
                        data[itemDate.getDate()] = [theme];
                    }
                }
            }
        });
        return data;
    }, [currentDate, news]);

    const renderDays = () => {
        const totalDays = daysInMonth(currentDate);
        const startDay = firstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for offset
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-lg"></div>);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const isToday = new Date().toDateString() === dateObj.toDateString();

            // Format YYYY-MM-DD local
            const dateId = `news-${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const themes = monthData[d];

            const scrollToDate = () => {
                const element = document.getElementById(dateId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                } else {
                    if (themes) {
                        alert("해당 날짜의 뉴스를 찾을 수 없습니다.");
                    }
                }
            };

            days.push(
                <div
                    key={d}
                    onClick={scrollToDate}
                    className={`h-24 border rounded-lg p-1 relative flex flex-col items-start justify-start transition-all duration-200 bg-white ${isToday ? 'ring-2 ring-blue-500 box-content z-10' : 'border-slate-100'} ${themes ? 'cursor-pointer hover:shadow-md hover:border-blue-200 hover:bg-blue-50/30' : ''}`}
                >
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                        {d}
                    </span>
                    {themes && themes.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4 pointer-events-none">
                            {/* Main Theme */}
                            <span className="text-3xl filter drop-shadow-sm leading-none z-10 transform hover:scale-110 transition-transform">
                                {themes[0]}
                            </span>
                            {/* Second Theme (if exists) */}
                            {themes.length > 1 && (
                                <span className="text-lg filter drop-shadow-sm opacity-90 -mt-1 z-0">
                                    {themes[1]}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden p-6">
            {/* Legend */}
            <div className="mb-6 flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🚗</span>복합/자율</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">💾</span>반도체</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🤖</span>로봇</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">💊</span>바이오</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🚀</span>우주</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🔨</span>정책</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🚢</span>조선</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">⚡</span>2차전지</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">💄</span>화장품</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🤝</span>경영</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🔒</span>보안</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="text-base">🌬️</span>풍력</span>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    {currentDate.toLocaleString('ko-KR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        ←
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        →
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <div key={day} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {renderDays()}
            </div>
        </div>
    );
}
