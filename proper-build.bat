@echo off
set PATH=C:\Program Files\nodejs;C:\Users\zhangdeqiang\AppData\Roaming\npm;%PATH%
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
call npm.cmd run build > build-output.txt 2>&1
echo Exit code: %ERRORLEVEL% > build-status.txt
