@echo off
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"
"C:\Program Files\nodejs\npm.cmd" install
echo Installation complete. Exit code: %ERRORLEVEL%
dir node_modules | find /c "Directory"
