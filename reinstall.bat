@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
call "C:\Program Files\nodejs\npm.cmd" install --no-optional > npm-install-log.txt 2>&1
echo Exit code: %ERRORLEVEL% > npm-install-status.txt
