'use client';

import { useState, useMemo } from 'react';

type NewsItem = {
    id: number;
    date: string;
    content: string;
    source: string;
    isemusaContent?: string;
};

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

// Subcomponent for News Item
function NewsItemCard({ item, filterMinCap }: { item: NewsItem, filterMinCap: boolean }) {
    const displayContent = useMemo(() => {
        // Filter if needed and if it's Mongdang content (usually has market cap info)
        if (filterMinCap && item.source === '몽당연필') {
            return filterHtmlContent(item.content, 1000);
        }
        return item.content;
    }, [item.content, filterMinCap, item.source]);

    const itemDate = new Date(item.date);
    const dateId = `news-${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;

    const isLeesemusa = item.source === '이세무사';

    return (
        <article id={dateId} className="group bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-slate-100 scroll-mt-24">
            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-end mb-6 pb-4 border-b border-slate-50">
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
    const [currentSource, setCurrentSource] = useState('몽당연필'); // '몽당연필' or '이세무사'

    const filteredNews = useMemo(() => {
        return initialNews.filter(item => {
            const itemSource = item.source || '몽당연필';
            return itemSource === currentSource;
        });
    }, [initialNews, currentSource]);

    return (
        <div className="lg:col-span-1 space-y-8 lg:-mt-[3.5rem]">
            {/* Controls & Tabs */}
            <div className="sticky top-8 z-10 space-y-4 mb-8">
                <div className="flex justify-between items-center bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-slate-200/60">
                    {/* Source Tabs */}
                    <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-xl">
                        <button
                            onClick={() => setCurrentSource('몽당연필')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${currentSource === '몽당연필'
                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:bg-white/50'
                                }`}
                        >
                            몽당연필
                        </button>
                        <button
                            onClick={() => setCurrentSource('이세무사')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${currentSource === '이세무사'
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:bg-white/50'
                                }`}
                        >
                            이세무사
                        </button>
                    </div>

                    {/* Filter Toggle */}
                    <label className="flex items-center cursor-pointer space-x-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                        <input
                            type="checkbox"
                            checked={filterMinCap}
                            onChange={(e) => setFilterMinCap(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">시총 1000억 이상</span>
                    </label>
                </div>
            </div>

            {filteredNews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-lg">
                        {currentSource === '이세무사' ? '이세무사 컨텐츠가 없습니다.' : '표시할 뉴스가 없습니다.'}
                    </p>
                </div>
            ) : filteredNews.map((item) => (
                <NewsItemCard key={item.id} item={item} filterMinCap={filterMinCap} />
            ))}
        </div>
    );
}
