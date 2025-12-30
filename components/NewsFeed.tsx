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

    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleSummarize = async () => {
        if (!youtubeUrl) return;
        setIsSummarizing(true);
        try {
            // Get today's date or the date relevant to the view. 
            // Assuming for now we are adding content for "today" or a specific date from context.
            // But NewsFeed is a list. If we are on a dashboard showing "latest", we might want to tag it with today's date.
            // Or if the user selected a date in calendar (which is not passed here directly, but `initialNews` has items).
            // Let's use today's date strings for simplicity as a default, 
            // or we might need to ask user for date if not implied.
            // For now, let's use the current client date (KST).
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl, date: dateStr }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || '요약에 실패했습니다.');
            } else {
                alert('요약이 완료되었습니다.');
                // Refresh the page to show new content
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        } finally {
            setIsSummarizing(false);
        }
    };

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
                        {currentSource === '이세무사' ? (
                            <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
                                <p className="text-slate-500 text-lg">이세무사 컨텐츠가 없습니다.</p>
                                <div className="w-full space-y-2">
                                    <p className="text-sm text-slate-400 text-center">YouTube URL을 입력하여 요약할 수 있습니다.</p>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            placeholder="https://youtu.be/..."
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                        />
                                        <button
                                            onClick={handleSummarize}
                                            disabled={isSummarizing || !youtubeUrl}
                                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                        >
                                            {isSummarizing ? '요약 중...' : '요약하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-lg">표시할 뉴스가 없습니다.</p>
                        )}
            ) : filteredNews.map((item) => (
                        <NewsItemCard key={item.id} item={item} filterMinCap={filterMinCap} />
            ))}
                </div>
            );
}
