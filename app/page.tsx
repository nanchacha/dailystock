import { promises as fs } from 'fs';
import path from 'path';

type NewsItem = {
  id: number;
  date: string;
  content: string;
  source: string;
};

// Force dynamic rendering so we see new file changes on refresh without rebuild
export const dynamic = 'force-dynamic';

async function getNews() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'stock_news.json');
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    // Sort by date descending
    return data.sort((a: NewsItem, b: NewsItem) => new Date(b.date).getTime() - new Date(a.date).getTime()) as NewsItem[];
  } catch (error) {
    console.error("Error reading news file:", error);
    return [];
  }
}

import Calendar from '@/components/Calendar';

export default async function Home() {
  const news = await getNews();

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
              Daily Stock Brief
            </h1>
            <p className="text-lg text-slate-600">
              매일 장 마감 후 업데이트되는 핵심 주식 정보
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Sidebar - Left Side (Calendar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Calendar news={news} />

              {/* Tip Widget */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800">
                <h3 className="font-bold text-lg mb-2">💡 Tip</h3>
                <p className="text-slate-300 text-sm">
                  달력의 날짜를 확인하여<br />
                  월별 테마 흐름을 한눈에 파악하세요.
                </p>
              </div>
            </div>
          </div>

          {/* Feed Section - Right Side (News) */}
          <div className="lg:col-span-1 space-y-8">
            {news.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-lg">오늘 수집된 뉴스가 없습니다.</p>
                <p className="text-slate-400 text-sm mt-2">자동 수집기를 확인해주세요.</p>
              </div>
            ) : news.map((item) => {
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
        </div>

        <footer className="mt-20 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Daily Stock Brief. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
