'use client';

import { useState, useMemo } from 'react';

type NewsItem = {
    id: number;
    date: string;
    content: string;
    source: string;
};

function parseMarketCap(text: string): number {
    // Extract the specific "Market Cap" part usually in parentheses like (상승률 30%, 시총 1300억대)
    // or simple text.
    // Search for "시총" and the following numbers
    const match = text.match(/시총\s*([0-9,]+조)?\s*([0-9,]+억?)?/);
    if (!match) return 0;

    let total = 0;

    // parts: match[1] might be "1조", match[2] might be "2000억" or "2000"
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
    // Use a DOM parser to safely manipulate the structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const categories = doc.querySelectorAll('div.mb-6');

    categories.forEach(div => {
        const listItems = div.querySelectorAll('li');
        let hasVisibleItems = false;

        listItems.forEach(li => {
            const text = li.textContent || '';
            const cap = parseMarketCap(text);

            // If no cap found (e.g. general text), usually keep it? 
            // User request: "시총 1000억대 이상만"
            // If we can't parse it, maybe it's not a stock line (shouldn't happen with current scraper).
            // But let's look at `details.marketCap`.
            // The text is like `(상승률 X%, 시총 Y)`.

            // If cap is 0 (not found) and line looks like a stock line, hide it or keep?
            // "개별주 다수" -> cap 0. Keep it? or Hide?
            // Probably safe to hide if we strictly want >1000.

            // Special logic: If cap >= minCap, keep. Else remove.
            if (cap >= minCap) {
                hasVisibleItems = true;
            } else {
                li.remove();
            }
        });

        // If no items left in this category, remove the category div
        // But verify if the list was actually empty to begin with?
        // If the ul has no child nodes (li), remove div.
        const ul = div.querySelector('ul');
        if (ul && ul.children.length === 0) {
            div.remove();
        }
    });

    return doc.body.innerHTML;
}

export default function NewsFeed({ initialNews }: { initialNews: NewsItem[] }) {
    const [filterMinCap, setFilterMinCap] = useState(false);

    const filteredNews = useMemo(() => {
        if (!filterMinCap) return initialNews;

        if (typeof window === 'undefined') return initialNews; // server side safe guard

        return initialNews.map(item => ({
            ...item,
            content: filterHtmlContent(item.content, 1000)
        }));
    }, [initialNews, filterMinCap]);

    return (
        <div className="lg:col-span-1 space-y-8 lg:-mt-[3.5rem]">
            {/* Controls */}
            <div className="sticky top-8 z-10 flex justify-end items-center mb-4 backdrop-blur-sm bg-slate-50/80 py-2 -mx-2 px-2 rounded-xl transition-all">
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

            {filteredNews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-lg">표시할 뉴스가 없습니다.</p>
                </div>
            ) : filteredNews.map((item) => {
                const itemDate = new Date(item.date);
                const dateId = `news-${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;

                return (
                    <article id={dateId} key={item.id} className="group bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-slate-100 scroll-mt-24">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                    {item.source}
                                </span>
                                <time className="text-sm font-medium text-slate-400">
                                    {itemDate.toLocaleString('ko-KR', {
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </time>
                            </div>
                            <div className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />
                        </div>
                    </article>
                );
            })
            }
        </div>
    );
}
