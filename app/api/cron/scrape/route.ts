
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { formatStockReport } from '@/lib/scraperUtils';
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// Ensure this route is not cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic authorization check (e.g. CRON_SECRET)
    // For now we will skip strict auth for demo, but in production Vercel Cron sends a header.
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new NextResponse('Unauthorized', { status: 401 });
        // NOTE: For testing purposes, we might temporarily disable this check or allow user to run it via browser.
        // Let's keep it open or check query param for now?
        // Ideally: check process.env.CRON_SECRET
    }

    const apiId = parseInt(process.env.API_ID!);
    const apiHash = process.env.API_HASH;
    const channelUsername = process.env.CHANNEL_USERNAME;
    const sessionString = process.env.TELEGRAM_SESSION; // We need to add this to .env

    if (!apiId || !apiHash || !channelUsername || !sessionString) {
        return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
    }

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
        connectionRetries: 5,
    });

    try {
        await client.connect(); // Use connect() instead of start() as we have a session

        // Check if authorized
        if (!await client.checkAuthorization()) {
            return NextResponse.json({ error: "Telegram authorization failed. Session might be invalid." }, { status: 401 });
        }

        console.log(`Fetching messages from ${channelUsername}...`);

        // Fetch last 24 hours of messages (or more safely, last 50 messages)
        // Vercel function timeout is 10s (Hobby) or 60s (Pro). 
        // We must be quick.
        const messages = await client.getMessages(channelUsername, {
            limit: 50,
        });

        const targetPhrase = "몽당연필의 장마감 시황";
        const meaningfulKeywords = [targetPhrase, "상승률TOP30", "TOP30 정보 작성자", "상승률 TOP30"];

        const processedNews = [];

        for (const message of messages) {
            if (!message.message) continue;
            const content = message.message;

            // Check Relevance
            const isRelevant = meaningfulKeywords.some(keyword => content.includes(keyword));
            if (!isRelevant) continue;

            const dateObj = new Date(message.date * 1000);
            const dateParams = { timeZone: "Asia/Seoul" };
            // Note: In Supabase we store as Timestamp.

            // Logic for Mongdang cleaning
            let fullContent = content;

            // Clean Header
            if (fullContent.includes(targetPhrase)) {
                const parts = fullContent.split(targetPhrase);
                if (parts.length > 1) {
                    fullContent = parts.slice(1).join(targetPhrase).trim();
                }
            }
            // Clean Footer
            const disclaimerMarker = "[주의사항]";
            if (fullContent.includes(disclaimerMarker)) {
                fullContent = fullContent.split(disclaimerMarker)[0].trim();
            }

            // Format
            try {
                const formatted = formatStockReport(fullContent);
                if (formatted) fullContent = formatted;
            } catch (e) {
                console.error("Format error", e);
            }

            // Upsert into DB
            // We use message ID as the key.
            const { error } = await supabase
                .from('stock_news')
                .upsert({
                    id: message.id,
                    date: dateObj.toISOString(),
                    content: fullContent,
                    source: '몽당연필',
                    // TODO: Detect 'Lee Semusa' content and change source?
                    // The current logic only targets Mongdang.
                    // If we want to support Lee Semusa here, we need his keywords.
                });

            if (error) {
                console.error("Supabase error:", error);
            } else {
                processedNews.push({ id: message.id, date: dateObj });
            }
        }

        return NextResponse.json({ success: true, processed: processedNews.length, items: processedNews });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        await client.disconnect();
    }
}
