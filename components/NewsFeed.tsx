'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

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


function cleanHtmlContent(html: string): string {
    // Basic cleanup to remove empty sections that might have been left over
    if (typeof window === 'undefined') return html; // Server-side safety

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Remove mb-6 sections (Main Categories) if they have no UL or empty UL
    const categories = doc.querySelectorAll('div.mb-6');
    categories.forEach(div => {
        const ul = div.querySelector('ul');
        if (!ul || ul.children.length === 0 || !ul.textContent?.trim()) {
            div.remove();
        }
    });

    // 2. Remove any truly empty divs (whitespace only)
    doc.querySelectorAll('div').forEach(div => {
        if (!div.textContent?.trim() && div.children.length === 0) {
            div.remove();
        }
    });

    return doc.body.innerHTML;
}

function filterHtmlContent(html: string, minCap: number): string {
    if (typeof window === 'undefined') return html;

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

// Subcomponent for News Item Content
function NewsContent({ item, filterMinCap, setFilterMinCap }: { item: NewsItem, filterMinCap: boolean, setFilterMinCap: (v: boolean) => void }) {
    const [displayContent, setDisplayContent] = useState(item.content);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        let content = item.content;

        if (item.source === '몽당연필') {
            if (filterMinCap) {
                content = filterHtmlContent(content, 1000);
            }
            content = cleanHtmlContent(content);
        }

        if (content !== displayContent) {
            setDisplayContent(content);
        }

        if (!content) {
            setShouldHide(true);
            return;
        }
        const trimmed = content.trim();
        if (trimmed === '') {
            setShouldHide(true);
            return;
        }

        if (item.source === '몽당연필') {
            const div = document.createElement('div');
            div.innerHTML = trimmed;
            const hasText = div.textContent && div.textContent.trim().length > 0;
            const hasMedia = div.querySelector('img') || div.querySelector('iframe');
            if (!hasText && !hasMedia) setShouldHide(true);
            else setShouldHide(false);
        } else {
            if (trimmed.length === 0) setShouldHide(true);
            else setShouldHide(false);
        }

    }, [item.content, item.source, filterMinCap, displayContent]);

    if (shouldHide) return <div className="p-4 text-center text-gray-400">내용이 없습니다.</div>;

    const toggle = (
        <label className="flex items-center cursor-pointer space-x-2 select-none" onClick={(e) => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={filterMinCap}
                onChange={(e) => setFilterMinCap(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-slate-600 text-sm">시총 1000억 이상</span>
        </label>
    );

    // If Mongdang Pencil, try to split content to inject toggle in header
    if (item.source === '몽당연필') {
        // Regex to split: Preamble, Header, Rest
        // Matches <h2 ...> ... 상승률 TOP 30 정리 ... </h2>
        const headerRegex = /(<h2[^>]*>.*?상승률\s*TOP\s*30\s*정리.*?<\/h2>)/i;
        const parts = displayContent.split(headerRegex);

        if (parts.length >= 3) {
            const preamble = parts[0];
            const headerHtml = parts[1]; // The full <h2>...</h2> string
            const rest = parts.slice(2).join('');

            // Extract text from headerHtml to re-render cleanly
            const headerTextMatch = headerHtml.match(/>(.*?)</);
            const headerText = headerTextMatch ? headerTextMatch[1] : "상승률 TOP 30 정리";

            return (
                <div className="text-slate-700 leading-relaxed">
                    {/* Preamble */}
                    <div dangerouslySetInnerHTML={{ __html: preamble }} />

                    {/* Custom Header with Toggle */}
                    <div className="flex flex-wrap justify-between items-end mb-4 border-b border-gray-200 pb-2 gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                            {headerText}
                        </h2>
                        <div className="mb-0.5">
                            {toggle}
                        </div>
                    </div>

                    {/* Rest of Content */}
                    <div dangerouslySetInnerHTML={{ __html: rest }} />
                </div>
            );
        }
    }

    // Fallback or Isamusa
    return (
        <div className="text-slate-700 leading-relaxed prose prose-sm max-w-none">
            {item.source === '이세무사' ? (
                <ReactMarkdown>{displayContent}</ReactMarkdown>
            ) : (
                <div dangerouslySetInnerHTML={{ __html: displayContent }} />
            )}
        </div>
    );
}

// Daily Card Component that holds tabs
function DailyNewsCard({ dateKey, items }: { dateKey: string, items: { [key: string]: NewsItem } }) {
    const [activeTab, setActiveTab] = useState('몽당연필');
    const [filterMinCap, setFilterMinCap] = useState(false);

    // Determine available tabs
    const hasMongdang = !!items['몽당연필'];
    const hasLee = !!items['이세무사'];

    const activeItem = items[activeTab];

    const displayDate = new Date(dateKey); // dateKey is YYYY-MM-DD (KST based if grouped correctly)
    // Actually dateKey comes from initialNews grouping. 
    // We should parse one of the items to get a Date object for formatting, 
    // or just trust the grouping key if it's reliable.
    // Let's use the date from one of the items for accurate Time formatting if needed, 
    // but dateKey is likely sufficient for the Header.

    const dateId = `news-${dateKey}`;

    return (
        <article id={dateId} className="group bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-slate-100 scroll-mt-24 mb-8">
            <div className="p-6 sm:p-8">
                {/* Header: Tabs (Left) - Filter (Center) - Date (Right) */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between mb-6 pb-4 border-b border-slate-50 gap-4">
                    {/* Left: Tabs */}
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl z-10 self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab('몽당연필')}
                            disabled={!hasMongdang}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === '몽당연필'
                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                : hasMongdang ? 'text-slate-500 hover:bg-white/50' : 'text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            몽당연필
                        </button>
                        <button
                            onClick={() => setActiveTab('이세무사')}
                            disabled={!hasLee}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === '이세무사'
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5'
                                : hasLee ? 'text-slate-500 hover:bg-white/50' : 'text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            이세무사
                        </button>
                    </div>

                    {/* Filter Toggle removed from here */}

                    {/* Right: Date */}
                    <time className="text-sm font-medium text-slate-400 z-10 self-end sm:self-auto" suppressHydrationWarning>
                        {displayDate.toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                        })}
                    </time>
                </div>

                {/* Content */}
                {activeItem ? (
                    <NewsContent
                        item={activeItem}
                        filterMinCap={filterMinCap}
                        setFilterMinCap={setFilterMinCap}
                    />
                ) : (
                    <div className="py-10 text-center text-slate-400 text-sm bg-slate-50/50 rounded-xl">
                        해당 소식은 없습니다.
                    </div>
                )}
            </div>
        </article>
    );
}

export default function NewsFeed({ initialNews }: { initialNews: NewsItem[] }) {
    // Group items by Date
    const groupedNews = useMemo(() => {
        const groups: { [date: string]: { [source: string]: NewsItem } } = {};

        initialNews.forEach(item => {
            // Convert to YYYY-MM-DD
            const d = new Date(item.date);
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (!groups[dateKey]) {
                groups[dateKey] = {};
            }

            // source validation
            const source = (item.source === '이세무사') ? '이세무사' : '몽당연필';
            groups[dateKey][source] = item;
        });

        // Convert to array and sort by date descending
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [initialNews]);

    return (
        <div className="lg:col-span-1 space-y-8 lg:-mt-[3.5rem]">
            {/* Global Controls removed as requested, moved to each card */}

            {groupedNews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-lg">표시할 뉴스가 없습니다.</p>
                </div>
            ) : (
                groupedNews.map(([dateKey, items]) => (
                    <DailyNewsCard key={dateKey} dateKey={dateKey} items={items} />
                ))
            )}
        </div>
    );
}
