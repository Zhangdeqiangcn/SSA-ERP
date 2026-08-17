@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
set PATH=%PATH%;C:\Program Files\nodejs
"C:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc --noEmit > build-output.txt 2> build-errors.txt
echo Exit code: %ERRORLEVEL% > build-status.txt
