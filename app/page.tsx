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
import NewsFeed from '@/components/NewsFeed';

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
              <div className="bg-slate-100 text-slate-900 rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg mb-2">💡 Tip</h3>
                <p className="text-slate-600 text-sm">
                  달력의 날짜를 확인하여<br />
                  월별 테마 흐름을 한눈에 파악하세요.
                </p>
              </div>
            </div>
          </div>

          {/* Feed Section - Right Side (News) */}
          <NewsFeed initialNews={news} />
        </div>

        <footer className="mt-20 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Daily Stock Brief. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
