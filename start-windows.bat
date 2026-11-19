@echo off
cd /d "%~dp0"
if not exist backend\.env (
  copy backend\.env.example backend\.env
  echo Created backend\.env. Please edit JWT_SECRET and run this file again.
  notepad backend\.env
  pause
  exit /b
)
npm run dev
pause