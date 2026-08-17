@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
set PATH=%PATH%;%CD%\node_modules\.bin
call "C:\Program Files\nodejs\npm.cmd" run build > build-output.txt 2> build-errors.txt
echo Exit code: %ERRORLEVEL% > build-status.txt
