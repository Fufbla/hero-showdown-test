@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if errorlevel 1 (
  python start-scorpion-test.py
) else (
  py -3 start-scorpion-test.py
)
pause
