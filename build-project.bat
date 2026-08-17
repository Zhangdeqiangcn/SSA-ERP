@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
call "C:\Program Files\nodejs\npm.cmd" run build
echo Build exit code: %ERRORLEVEL%
