
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Env Vars
// Try process.env first (for GitHub Actions), then fallback to local .env
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    const envPath = path.resolve(__dirname, '../.env'); // Root .env
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                if (key === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = SUPABASE_URL || value;
                if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !process.env.SUPABASE_SERVICE_ROLE_KEY) SUPABASE_KEY = value;
                if (key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = value; // Prefer service role if in .env
            }
        });
    }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    const jsonPath = path.resolve(__dirname, '../public/data/stock_news.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("stock_news.json not found at", jsonPath);
        process.exit(1); // Fail if file is missing
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const newsData = JSON.parse(rawData);

    console.log(`Found ${newsData.length} items to migrate...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of newsData) {
        // Prepare payload matching our table schema
        // Schema: id (bigint), date (timestamp), content (text), source (text)
        const payload = {
            id: item.id,
            date: item.date, // JSON already has ISO string, which fits timestampz
            content: item.content,
            source: item.source || '몽당연필', // Default to Mongdang if missing
            updated_at: new Date().toISOString(), // Optional: track update time
        };

        const { error } = await supabase
            .from('stock_news')
            .upsert(payload);

        if (error) {
            console.error(`Failed to upsert ID ${item.id}:`, error.message);
            failCount++;
        } else {
            // console.log(`Migrated ID ${item.id}`);
            successCount++;
        }
    }

    console.log(`Migration Complete. Success: ${successCount}, Failed: ${failCount}`);

    if (failCount > 0) {
        console.error("Migration finished with errors.");
        process.exit(1);
    }
}

migrate();
