'use client';

import { useState, useMemo } from 'react';

type NewsItem = {
    id: number;
    date: string;
    content: string;
    source: string;
};

// ... existing helper functions ...
function parseMarketCap(text: string): number {
    const match = text.match(/시총\s*([0-9,]+조)?\s*([0-9,]+억?)?/);
    if (!match) return 0;

    let total = 0;
    let partJo = match[1] || '';
    let partUk = match[2] || '';

    if (partJo) {
        total += parseInt(partJo.replace(/[^0-9]/g, '')) * 10000;
    }

    if (partUk) {
        total += parseInt(partUk.replace(/[^0-9]/g, ''));
    }

    return total;
}

function filterHtmlContent(html: string, minCap: number): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const categories = doc.querySelectorAll('div.mb-6');

    categories.forEach(div => {
        const listItems = div.querySelectorAll('li');

        listItems.forEach(li => {
            const text = li.textContent || '';
            const cap = parseMarketCap(text);

            if (cap >= minCap) {
                // keep
            } else {
                li.remove();
            }
        });

        const ul = div.querySelector('ul');
        if (ul && ul.children.length === 0) {
            div.remove();
        }
    });

    return doc.body.innerHTML;
}

// Subcomponent for Source Tab
function SourceTab({ source, isActive, onClick }: { source: string, isActive: boolean, onClick: () => void }) {
    if (isActive) {
        return (
            <button
                onClick={onClick}
                className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full ring-2 ring-blue-100 transition-all shadow-sm"
            >
                {source}
            </button>
        );
    }
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-slate-100 transition-all"
        >
            {source}
        </button>
    );
}

// Subcomponent for News Item to handle internal state (Tab Selection)
function NewsItemCard({ item, filterMinCap }: { item: NewsItem, filterMinCap: boolean }) {
    // 0: Source (Mongdang), 1: Isemusa
    const [activeTab, setActiveTab] = useState<0 | 1>(0);

    const displayContent = useMemo(() => {
        if (activeTab === 0) {
            // Filter if needed
            if (filterMinCap) {
                return filterHtmlContent(item.content, 1000);
            }
            return item.content;
        } else {
            // Placeholder for 'Isemusa' content
            return `<div class="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p>준비중인 컨텐츠입니다.</p>
            </div>`;
        }
    }, [item.content, filterMinCap, activeTab]);

    const itemDate = new Date(item.date);
    const dateId = `news-${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;

    return (
        <article id={dateId} className="group bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-slate-100 scroll-mt-24">
            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        {/* Tab 1: Mongdang (Original Source) */}
                        <SourceTab
                            source={item.source}
                            isActive={activeTab === 0}
                            onClick={() => setActiveTab(0)}
                        />
                        {/* Tab 2: Isemusa (Manual Addition) */}
                        <button
                            onClick={() => setActiveTab(1)}
                            className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${activeTab === 1
                                    ? 'bg-pink-100 text-red-600 ring-2 ring-pink-200 shadow-sm'
                                    : 'bg-pink-50 text-red-600/70 hover:bg-pink-100 hover:text-red-600'
                                }`}
                        >
                            이세무사
                        </button>
                    </div>
                    <time className="text-sm font-medium text-slate-400">
                        {itemDate.toLocaleString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </time>
                </div>
                <div className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: displayContent }} />
            </div>
        </article>
    );
}

export default function NewsFeed({ initialNews }: { initialNews: NewsItem[] }) {
    const [filterMinCap, setFilterMinCap] = useState(false);

    return (
        <div className="lg:col-span-1 space-y-8 lg:-mt-[3.5rem]">
            {/* Controls */}
            <div className="sticky top-8 z-10 flex justify-end items-center mb-4">
                <label className="flex items-center cursor-pointer space-x-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                    <input
                        type="checkbox"
                        checked={filterMinCap}
                        onChange={(e) => setFilterMinCap(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">시총 1000억 이상만 보기</span>
                </label>
            </div>

            {initialNews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-lg">표시할 뉴스가 없습니다.</p>
                </div>
            ) : initialNews.map((item) => (
                <NewsItemCard key={item.id} item={item} filterMinCap={filterMinCap} />
            ))}
        </div>
    );
}
