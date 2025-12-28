# Daily Stock Brief 📈

Automated daily stock news dashboard.
- **Bot**: Collects stock news from Telegram.
- **Web**: Next.js dashboard to display the news.

## Vercel Deployment Guide

1. **Root Directory**: Leave it **EMPTY** (Project Settings > General).
2. **Framework Preset**: Next.js.
3. **Build Command**: `next build` (Default).
4. **Environment Variables**: Not required for the web frontend (Read-only from JSON).

## Local Development

```bash
# Web
npm install
npm run dev

# Bot
node bot/scraper.js
```
