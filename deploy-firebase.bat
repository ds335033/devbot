@echo off
echo ========================================
echo   DevBotAI Firebase Deploy Script
echo ========================================
echo.

echo Step 1: Logging in to Google/Firebase...
call npx firebase-tools login
echo.

echo Step 2: Creating Firebase project...
call npx firebase-tools projects:create devbotai-platform --display-name "DevBotAI" 2>nul
echo.

echo Step 3: Setting up Firebase Hosting site...
call npx firebase-tools hosting:sites:create devbotai 2>nul
echo.

echo Step 4: Deploying to Firebase Hosting...
call npx firebase-tools deploy --only hosting
echo.

echo ========================================
echo   DONE! Your site is live at:
echo   https://devbotai.web.app
echo   https://devbotai.firebaseapp.com
echo ========================================
pause
