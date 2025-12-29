const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // npm install input
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const channelUsername = process.env.CHANNEL_USERNAME;
const sessionFile = path.resolve(__dirname, "session_string.txt"); // Save session string to file to reuse

// Ensure data directory exists
const targetPath = path.resolve(__dirname, process.env.TARGET_JSON_PATH || "../public/data/stock_news.json");

async function main() {
    if (!apiId || !apiHash || !channelUsername) {
        console.error("Missing API_ID, API_HASH, or CHANNEL_USERNAME in .env");
        return;
    }

    console.log("Loading session...");
    let stringSession = new StringSession("");
    if (fs.existsSync(sessionFile)) {
        const savedSession = fs.readFileSync(sessionFile, "utf8");
        stringSession = new StringSession(savedSession);
        console.log("Session loaded from file.");
    }

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    console.log("Connected to Telegram!");

    // Save session for next time
    fs.writeFileSync(sessionFile, client.session.save());

    console.log(`Fetching messages from ${channelUsername}...`);

    // Calculate date range for fetching messages
    // To facilitate testing, we'll fetch messages from the last 30 days.
    // In a real daily usage scenario, you might want to switch this back to 24 hours.
    const now = new Date();
    const daysToFetch = 30; // Fetch last 30 days
    const cutoffDate = new Date(now.getTime() - daysToFetch * 24 * 60 * 60 * 1000);

    const messages = await client.getMessages(channelUsername, {
        limit: 1000, // Fetch more messages to get older data
    });

    // 1. Collect all relevant messages first
    const validMessages = [];
    const targetPhrase = "몽당연필의 장마감 시황";
    const meaningfulKeywords = [targetPhrase, "상승률TOP30", "TOP30 정보 작성자", "상승률 TOP30"];

    for (const message of messages) {
        if (message.date <= cutoffDate.getTime() / 1000) continue;
        if (!message.message) continue;

        const content = message.message;
        const isRelevant = meaningfulKeywords.some(keyword => content.includes(keyword));

        if (isRelevant) {
            validMessages.push({
                id: message.id,
                dateObj: new Date(message.date * 1000), // Keep Date object for sorting/key
                content: content
            });
        }
    }

    // 2. Group by date (YYYY-MM-DD in KST)
    // Assuming messages are from the same "report" if they are on the same day.
    const groupedMessages = {};

    for (const msg of validMessages) {
        // Convert to KST string for grouping key
        const dateKey = msg.dateObj.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

        if (!groupedMessages[dateKey]) {
            groupedMessages[dateKey] = [];
        }
        groupedMessages[dateKey].push(msg);
    }

    const newsList = [];

    // 3. Process each group
    // Sort keys desc (Newest dates first)
    const sortedDates = Object.keys(groupedMessages).sort((a, b) => new Date(b) - new Date(a));

    for (const dateKey of sortedDates) {
        const msgs = groupedMessages[dateKey];

        // Sort messages by ID ascending (Oldest first -> Part 1, Part 2...)
        msgs.sort((a, b) => a.id - b.id);

        // Merge content
        let fullContent = msgs.map(m => m.content).join("\n\n");

        // 4. Clean Header
        // Remove everything up to "몽당연필의 장마감 시황" if it exists
        if (fullContent.includes(targetPhrase)) {
            const parts = fullContent.split(targetPhrase);
            if (parts.length > 1) {
                // Take the part after the phrase
                fullContent = parts.slice(1).join(targetPhrase).trim();
            }
        }

        // 5. Clean Footer (Stop at [주의사항])
        const disclaimerMarker = "[주의사항]";
        if (fullContent.includes(disclaimerMarker)) {
            fullContent = fullContent.split(disclaimerMarker)[0].trim();
        }

        // 6. Reformat content to match user preference
        try {
            const formattedContent = formatStockReport(fullContent);
            if (formattedContent) {
                fullContent = formattedContent;
            }
        } catch (e) {
            console.error("Error formatting content:", e);
            // Fallback to original cleaned content if formatting fails
        }

        // Use the date of the latest message in the group as the display date
        const latestDate = msgs[msgs.length - 1].dateObj.toISOString();

        newsList.push({
            id: msgs[0].id, // Use ID of the first message as the representative ID
            date: latestDate,
            content: fullContent,
            source: "몽당연필"
        });
    }

    console.log(`Collected ${newsList.length} recent messages.`);

    // Save to JSON
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(newsList, null, 2), "utf8");
    console.log(`Saved to ${targetPath}`);

    process.exit(0);
}

function formatStockReport(text) {
    // 1. Extract Stock Details from the numbered list
    // Regex matches: "1. Name (Rate%) : Category, MarketCap, ..."
    // Capture: Name, Rate, FirstPart(Category), SecondPart(MarketCap)
    const stockDetails = new Map();
    const itemRegex = /(\d+)\.\s+([^\(]+)\s+\(([^)]+)\)\s+:\s+([^,]+),\s+([^,]+)/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
        const name = match[2].trim();
        const rate = match[3].trim();
        const marketCap = match[5].trim().replace("시총", "").trim(); // Remove '시총' prefix if present

        stockDetails.set(name, {
            rate: rate,
            marketCap: marketCap
        });
    }

    // 2. Locate the Summary Section
    const summaryHeaderKeywords = ["상승률TOP30 정리", "상승률 TOP30 정리", "상승률TOP30정리"];
    let summaryStartIndex = -1;
    let summaryHeader = "";

    for (const keyword of summaryHeaderKeywords) {
        summaryStartIndex = text.indexOf(keyword);
        if (summaryStartIndex !== -1) {
            summaryHeader = keyword;
            break;
        }
    }

    if (summaryStartIndex === -1) return null; // No summary section found

    // 3. Parse the Summary Section
    const summaryText = text.substring(summaryStartIndex + summaryHeader.length).trim();
    const lines = summaryText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let formattedOutput = `<h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-4 border-b pb-2">상승률 TOP 30 정리</h2>`;

    // We expect: Category Line -> Stock List Line -> Category Line -> ...
    // Sometimes there are empty lines in between.

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Heuristic: A line is a "Category" if it doesn't look like a list of stocks (contains commas and ends with count like '(N)')
        // Actually, the stock list line usually ends with `(N)`.
        // The category line usually just text.

        // Let's look ahead to see if the next line is a list
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine.includes(',') || nextLine.match(/\(\d+\)$/)) {

                const category = line;
                const stocksPart = nextLine;

                // 1. Process and Deduplicate stocks first to get accurate count
                const cleanedStocksPart = stocksPart.replace(/\(\d+\)$/, "");
                let stockNames = cleanedStocksPart.split(/,|등/).map(s => s.trim()).filter(s => s.length > 0);
                stockNames = [...new Set(stockNames)]; // Deduplicate

                // Filter out stocks that do not have details (not in the Top 30 list)
                const validStockNames = stockNames.filter(name => stockDetails.has(name));

                if (validStockNames.length === 0) {
                    i++; // Skip the stock list line even if we don't print anything
                    continue;
                }

                const count = validStockNames.length;
                const countStr = count > 0 ? `${count}개` : "";

                // User requested: fixed 14pt font size
                const fontSizePt = 14;

                // Emoji mapping logic
                let emoji = "📈"; // Default
                if (category.includes("로봇")) emoji = "🤖";
                else if (category.includes("반도체")) emoji = "💽";
                else if (category.includes("제약") || category.includes("바이오")) emoji = "💊";
                else if (category.includes("자동차") || category.includes("자율주행") || category.includes("모빌리티")) emoji = "🚗";
                else if (category.includes("조선")) emoji = "🚢";
                else if (category.includes("우주") || category.includes("항공")) emoji = "🚀";
                else if (category.includes("화장품") || category.includes("뷰티")) emoji = "💄";
                else if (category.includes("신재생") || category.includes("풍력") || category.includes("태양광")) emoji = "🌀";
                else if (category.includes("배터리") || category.includes("2차전지") || category.includes("이차전지") || category.includes("에너지")) emoji = "⚡";
                else if (category.includes("게임")) emoji = "🎮";
                else if (category.includes("AI") || category.includes("인공지능")) emoji = "🧠";
                else if (category.includes("정치") || category.includes("정책") || category.includes("총선")) emoji = "🏛️";
                else if (category.includes("건설") || category.includes("재건")) emoji = "🏗️";
                else if (category.includes("방산") || category.includes("전쟁")) emoji = "⚔️";
                else if (category.includes("경영") || category.includes("인수")) emoji = "🤝";
                else if (category.includes("금융") || category.includes("투자")) emoji = "💰";
                else if (category.includes("보안") || category.includes("정보") || category.includes("해킹") || category.includes("드론")) emoji = "🔒";
                else if (category.includes("개별")) emoji = "✨";
                else if (category.includes("신규상장")) emoji = "🔥";

                formattedOutput += `<div class="mb-6">`;
                formattedOutput += `<h3 class="text-lg font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <span class="text-2xl mr-1">${emoji}</span> ${category} 
                    ${countStr ? `<span class="text-sm font-bold text-white bg-slate-500 px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex-shrink-0">${countStr}</span>` : ''}
                </h3>`;
                formattedOutput += `<ul class="space-y-1 ml-1" style="font-size: ${fontSizePt}pt; line-height: 1.6;">`;

                for (const stockName of validStockNames) {
                    const details = stockDetails.get(stockName);
                    // details is guaranteed to exist due to filter above
                    formattedOutput += `<li class="flex items-start text-slate-700">
                        <span class="mr-2 text-blue-300" style="font-size: 0.8em; margin-top: 0.3em;">•</span>
                        <span>
                            <strong class="font-semibold text-slate-800">${stockName}</strong>
                            <span style="font-size: 0.85em; opacity: 0.8;" class="ml-1 text-slate-600">(상승률 <span class="text-red-500 font-medium">${details.rate}</span>, 시총 ${details.marketCap})</span>
                        </span>
                    </li>`;
                }
                formattedOutput += `</ul></div>`;

                i++; // Skip the stock list line
                continue;
            }
        }

        // Handle "Individual" or other lines
        if (line.includes("개별주") || line.includes("기타")) {
            formattedOutput += `<div class="mb-4"><h3 class="text-lg font-bold text-slate-600 mb-1">${line}</h3></div>`;
        }
    }

    return formattedOutput;
}

main().catch(console.error);
