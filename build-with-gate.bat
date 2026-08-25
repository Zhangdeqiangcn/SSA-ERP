@echo off
REM P0 构建门禁：先跑 tsc 类型检查，存在类型错误则中止构建（避免漏 import/未定义变量导致运行期白屏）
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"

echo [P0 Gate] TypeScript 类型检查 (tsc --noEmit) ...
call "C:\Program Files\nodejs\npx.cmd" tsc --noEmit > build-output.txt 2> build-errors.txt
if %ERRORLEVEL% NEQ 0 (
  echo [P0 Gate] FAILED: 发现类型错误，构建已中止。详见 build-errors.txt
  exit /b %ERRORLEVEL%
)

echo [P0 Gate] 通过，开始构建 ...
call "C:\Program Files\nodejs\npm.cmd" run build
echo Build exit code: %ERRORLEVEL%
