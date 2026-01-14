
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log("Cleaning up recent stock news from DB (>= 2025-12-01)...");

    const { error } = await supabase
        .from('stock_news')
        .delete()
        .gte('date', '2025-12-01T00:00:00');

    if (error) {
        console.error("Error deleting data:", error);
    } else {
        console.log("Cleanup complete. Deleted recent records.");
    }
}

cleanup();
