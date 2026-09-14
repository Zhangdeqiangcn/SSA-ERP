@echo off
chcp 65001 >nul
REM ==================================================================
REM  SSA ERP 后台任务调度：注册 Windows 计划任务
REM ------------------------------------------------------------------
REM  作用：让本机每隔 N 分钟自动调用一次系统的「任务推进」接口，
REM        把到期的后台任务（安全邮箱延时投递等）执行掉。
REM
REM  背景：系统跑在 Cloudflare 上，平台本身没有定时任务能力，
REM        过去只能靠「正好有人访问系统」时顺带触发，无人访问就一直拖着。
REM        注册本计划任务后，只要这台电脑开着，任务就会按时推进。
REM
REM  使用：双击本文件 → 粘贴「安全中心 → 后台任务调度 → 查看调度令牌」里的令牌
REM        → 输入周期（默认 10 分钟）→ 完成。
REM ==================================================================

setlocal
set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%job-tick.ps1"
set "CONF=%SCRIPT_DIR%job-tick.conf"
set "TASK_NAME=SSA-ERP-JobTick"

if not exist "%PS1%" (
  echo [错误] 找不到 job-tick.ps1，请确认本文件与它放在同一目录。
  pause
  exit /b 1
)

echo ============================================================
echo  SSA ERP 后台任务调度注册向导
echo ============================================================
echo.
echo  第 1 步：请到系统里「设置 → 安全中心 → 后台任务调度」
echo           点「查看调度令牌」并复制那一串字符。
echo.
set /p JOB_TOKEN=请粘贴调度令牌:
if not defined JOB_TOKEN (
  echo [错误] 令牌不能为空。
  pause
  exit /b 1
)

echo.
set /p BASE_URL=系统访问地址（直接回车用 https://ssa-erp.pages.dev）:
if not defined BASE_URL set "BASE_URL=https://ssa-erp.pages.dev"

echo.
set /p INTERVAL=调度周期（分钟，直接回车用 10）:
if not defined INTERVAL set "INTERVAL=10"

REM 把配置落盘，计划任务每次读它，令牌不出现在命令行里
> "%CONF%" echo # SSA ERP 后台任务调度配置（由 register-job-tick-task.bat 生成）
>> "%CONF%" echo BaseUrl=%BASE_URL%
>> "%CONF%" echo Token=%JOB_TOKEN%

echo.
echo 正在注册计划任务「%TASK_NAME%」（每 %INTERVAL% 分钟执行一次）...

schtasks /Create /TN "%TASK_NAME%" /F /SC MINUTE /MO %INTERVAL% ^
  /TR "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"%PS1%\"" ^
  /RL HIGHEST

if errorlevel 1 (
  echo.
  echo [失败] 计划任务注册未成功。请右键本文件选择「以管理员身份运行」后重试。
  pause
  exit /b 1
)

echo.
echo [完成] 已注册。可以用下面的命令立即试跑一次：
echo        schtasks /Run /TN "%TASK_NAME%"
echo.
echo 查看运行状态：schtasks /Query /TN "%TASK_NAME%" /V /FO LIST
echo 卸载计划任务：schtasks /Delete /TN "%TASK_NAME%" /F
echo.
echo 现在立即试跑一次？
set /p RUNNOW=输入 Y 回车试跑，其它键跳过:
if /i "%RUNNOW%"=="Y" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
)
pause
