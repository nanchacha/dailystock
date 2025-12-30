
import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { url, date } = await request.json();

        if (!url || !date) {
            return NextResponse.json({ error: 'URL and date are required' }, { status: 400 });
        }

        // 1. Extract Video ID
        const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // 2. Fetch Transcript
        let transcriptText = '';
        try {
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
            transcriptText = transcriptItems.map(item => item.text).join(' ');
        } catch (error) {
            console.error("Transcript fetch error:", error);
            // Fallback: try without language param or handle errors gracefully
            // For now, return error as we need text to summarize
            return NextResponse.json({ error: 'Failed to fetch transcript. The video might not have captions.' }, { status: 422 });
        }

        // 3. Summarize with Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
      다음은 주식 관련 유튜브 영상의 자막 스크립트입니다. 
      이 내용을 바탕으로 "오늘의 주식 시황 및 주요 종목 분석" 리포트를 작성해주세요.
      
      형식은 다음과 같이 HTML 태그를 사용하여 가독성 있게 작성해주세요:
      
      <h2>1. 시장 요약</h2>
      <p>시장 흐름과 주요 이슈 요약...</p>
      
      <h2>2. 주요 섹터 및 종목</h2>
      <ul>
        <li><strong>섹터명:</strong> 관련 내용 및 종목...</li>
      </ul>
      
      <h2>3. 투자 인사이트</h2>
      <p>전문가 의견 요약...</p>

      ---
      스크립트:
      ${transcriptText.substring(0, 30000)} // Limit length if needed
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summaryHtml = response.text();

        // 4. Save to Supabase
        // Generate a unique ID based on date/video to prevent duplicates or simpler 'isemusa-{date}'
        // Since we need to display it for a specific date, we can use a timestamp-based ID or similar.
        // For simplicity, let's use a large integer or hash. 
        // Actually, 'stock_news' uses 'id' as integer (bigint).
        // Let's generate a pseudo-random ID based on date.
        const id = parseInt(date.replace(/-/g, '').substring(0, 8) + '999'); // e.g. 20241230999

        const { error } = await supabase
            .from('stock_news')
            .upsert({
                id: id,
                date: new Date(date).toISOString(),
                content: summaryHtml,
                source: '이세무사',
            });

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
        }

        return NextResponse.json({ success: true, summary: summaryHtml });

    } catch (error: any) {
        console.error("Summarize error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
