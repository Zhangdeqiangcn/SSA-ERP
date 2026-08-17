@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
echo Running TypeScript compiler check...
"C:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc --noEmit > build-output.txt 2>&1
set TSC_EXIT=%ERRORLEVEL%
echo tsc exit code: %TSC_EXIT% >> build-output.txt
if %TSC_EXIT% NEQ 0 (
  echo TypeScript compilation failed >> build-output.txt
  echo Exit code: %TSC_EXIT% > build-status.txt
  exit /b %TSC_EXIT%
)
echo TypeScript check passed. Running vite build...
"C:\Program Files\nodejs\node.exe" node_modules/vite/bin/vite.js build >> build-output.txt 2>&1
echo vite exit code: %ERRORLEVEL% >> build-output.txt
echo Exit code: %ERRORLEVEL% > build-status.txt
