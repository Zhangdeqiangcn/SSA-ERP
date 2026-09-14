# SSA ERP 后台任务推进（外部定时调度用）
# ------------------------------------------------------------------
# 用途：调用一次系统的「任务推进」接口，把到期的后台任务（如安全邮箱延时投递）执行掉。
#
# 为什么需要它：系统运行在 Cloudflare 平台上，该平台没有「定时任务」能力。
#   此前任务只能靠「正好有人访问系统」时顺带触发，没人访问就一直拖着。
#   用本脚本配合 Windows 计划任务，就能做到每 N 分钟稳定推进一次。
#
# 用法：
#   1) 在「设置 → 安全中心 → 后台任务调度」点「查看调度令牌」复制令牌；
#   2) 双击运行 register-job-tick-task.bat 完成注册（会问你令牌和周期）；
#   3) 也可以手动执行本脚本验证：
#        powershell -NoProfile -ExecutionPolicy Bypass -File job-tick.ps1 -BaseUrl "https://你的域名" -Token "调度令牌"
#
# 参数也可以写进同目录的 job-tick.conf（每行一个 键=值），避免命令行里出现令牌。

param(
  [string]$BaseUrl = '',
  [string]$Token = '',
  [string]$Conf = ''
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Conf) { $Conf = Join-Path $scriptDir 'job-tick.conf' }

# 1) 读配置文件（可选，用于存放令牌，避免每次命令行传参）
if (Test-Path $Conf) {
  foreach ($line in Get-Content $Conf) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*([^=]+)=(.*)$') {
      $k = $Matches[1].Trim()
      $v = $Matches[2].Trim()
      if ($k -eq 'BaseUrl' -and -not $BaseUrl) { $BaseUrl = $v }
      if ($k -eq 'Token' -and -not $Token) { $Token = $v }
    }
  }
}

if (-not $BaseUrl) { $BaseUrl = 'https://ssa-erp.pages.dev' }
if (-not $Token) {
  Write-Host '[job-tick] 缺少调度令牌：请在安全中心复制令牌，或写入 job-tick.conf（Token=...）' -ForegroundColor Yellow
  exit 1
}

$url = $BaseUrl.TrimEnd('/') + '/api/system/jobs'
try {
  $resp = Invoke-RestMethod -Method Post -Uri $url -Headers @{ 'X-Job-Token' = $Token } -ContentType 'application/json' -Body '{"action":"run"}' -TimeoutSec 60
  Write-Host ('[job-tick] ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $resp.message) -ForegroundColor Green
} catch {
  $msg = $_.Exception.Message
  Write-Host ('[job-tick] 调用失败：' + $msg) -ForegroundColor Red
  exit 2
}
