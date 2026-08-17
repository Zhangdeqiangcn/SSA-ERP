@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
call "C:\Program Files\nodejs\npx.cmd" tsc --version > tsc-version.txt 2>&1
call "C:\Program Files\nodejs\npx.cmd" tsc --noEmit > build-output.txt 2> build-errors.txt
echo Exit code: %ERRORLEVEL% > build-status.txt
