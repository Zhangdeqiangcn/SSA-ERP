@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
"C:\Users\zhangdeqiang\.workbuddy\binaries\node\versions\22.12.0\node.exe" node_modules\vite\bin\vite.js build > build_out2.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> build_out2.txt
