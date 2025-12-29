
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// Helper function to format the report
// This is copied from bot/scraper.js and adapted for TypeScript/Serverless
export function formatStockReport(text: string): string | null {
    // 1. Extract Stock Details from the numbered list
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

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine.includes(',') || nextLine.match(/\(\d+\)$/)) {

                const category = line;
                const stocksPart = nextLine;

                // 1. Process and Deduplicate stocks first
                const cleanedStocksPart = stocksPart.replace(/\(\d+\)$/, "");
                let stockNames = cleanedStocksPart.split(/,|등/).map(s => s.trim()).filter(s => s.length > 0);
                stockNames = [...new Set(stockNames)]; // Deduplicate

                // Filter out stocks that do not have details
                const validStockNames = stockNames.filter(name => stockDetails.has(name));

                if (validStockNames.length === 0) {
                    i++;
                    continue;
                }

                const count = validStockNames.length;
                const countStr = count > 0 ? `${count}개` : "";
                const fontSizePt = 14;

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
                    formattedOutput += `<li class="flex items-start text-slate-700">
                        <span class="mr-2 text-blue-300" style="font-size: 0.8em; margin-top: 0.3em;">•</span>
                        <span>
                            <strong class="font-semibold text-slate-800">${stockName}</strong>
                            <span style="font-size: 0.85em; opacity: 0.8;" class="ml-1 text-slate-600">(상승률 <span class="text-red-500 font-medium">${details.rate}</span>, 시총 ${details.marketCap})</span>
                        </span>
                    </li>`;
                }
                formattedOutput += `</ul></div>`;

                i++;
                continue;
            }
        }

        if (line.includes("개별주") || line.includes("기타")) {
            formattedOutput += `<div class="mb-4"><h3 class="text-lg font-bold text-slate-600 mb-1">${line}</h3></div>`;
        }
    }

    return formattedOutput;
}
