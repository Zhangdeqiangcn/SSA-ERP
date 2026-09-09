@echo off
REM ============================================================
REM SSA-ERP 推送到 GitHub（本机双击运行；需先确保仓库已存在）
REM   仓库地址：https://github.com/Zhangdeqiangcn/SSA-ERP
REM   前提：本机已安装 Git 且登录过 GitHub（凭据管理器存有令牌）
REM   注意：切勿执行 git add -A，避免把已归档 ima 的 HTML 交付物误推
REM ============================================================
cd /d "%~dp0"
echo 当前分支：
git branch --show-current
echo.
echo 核心源码已透明加密（GitHub 上为密文）；密钥在本机 .git/ssa.key，不上传。
echo 开始推送 master 到 origin ...
git push -u origin master
echo.
echo 推送结束（若提示输入密码，请用 GitHub 个人访问令牌 Personal Access Token，
echo fine-grained 令牌需勾选 repo 权限）。按任意键关闭。
pause
