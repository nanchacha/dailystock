
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Env Vars manually to avoid dependency issues
const envPath = path.resolve(__dirname, '../.env'); // Root .env
if (!fs.existsSync(envPath)) {
    console.error("No .env found at", envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        envVars[key] = value;
    }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    const jsonPath = path.resolve(__dirname, '../public/data/stock_news.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("stock_news.json not found at", jsonPath);
        return;
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
}

migrate();
