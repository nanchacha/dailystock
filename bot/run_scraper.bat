@echo off
cd /d "%~dp0"
echo Starting Stock News Scraper...
node scraper.js
echo.
echo Scraper finished. Closing in 5 seconds...
timeout /t 5
exit
