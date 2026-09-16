@echo off
REM P0 构建门禁：先跑 tsc 类型检查，存在类型错误则中止构建（避免漏 import/未定义变量导致运行期白屏）
cd /d "C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp"

echo [P0 Gate] TypeScript 类型检查 (tsc --noEmit) ...
call "C:\Program Files\nodejs\npx.cmd" tsc --noEmit > build-output.txt 2> build-errors.txt
if %ERRORLEVEL% NEQ 0 (
  echo [P0 Gate] FAILED: 发现类型错误，构建已中止。详见 build-errors.txt
  exit /b %ERRORLEVEL%
)

REM functions/ 不在 tsconfig.json 的 include 内，需单独检查（V3.7.0 新增，基线快照模式只报新增）
echo [P0 Gate] 后端 Functions 类型检查 (tsc-functions.mjs) ...
call "C:\Program Files\nodejs\node.exe" scripts\tsc-functions.mjs
if %ERRORLEVEL% NEQ 0 (
  echo [P0 Gate] FAILED: functions/ 存在新增类型错误，构建已中止
  exit /b %ERRORLEVEL%
)

REM 一致性常规检查（V3.13.0 起纳入门禁）：登记表 ↔ 生产库、前端调用 ↔ 后端路由
REM 端点探针因需线上部署，构建期用 --no-probe 跳过；发布后由 npm run check:smoke 单独跑
echo [P0 Gate] 一致性检查（登记表/路由核对，--no-probe）...
call "C:\Program Files\nodejs\node.exe" scripts\check-consistency.mjs --no-probe
if %ERRORLEVEL% NEQ 0 (
  echo [P0 Gate] FAILED: 一致性检查未通过（登记表或路由存在漂移），构建已中止
  exit /b %ERRORLEVEL%
)

echo [P0 Gate] 通过，开始构建 ...
call "C:\Program Files\nodejs\npm.cmd" run build
echo Build exit code: %ERRORLEVEL%
