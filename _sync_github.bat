@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0"

set "REMOTE_URL=https://github.com/sjm1011/hpa.git"
set "BRANCH=main"

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 找不到 Git，請先安裝 Git for Windows。
  goto :failed
)

if not exist ".git" (
  echo [INFO] 初始化本機 Git 儲存庫。
  git init -b "%BRANCH%"
  if errorlevel 1 goto :failed

  git remote add origin "%REMOTE_URL%"
  if errorlevel 1 goto :failed

  git fetch origin "%BRANCH%"
  if errorlevel 1 goto :failed

  rem 保留目前工作目錄內容，僅讓本機分支接續遠端歷史。
  git reset --mixed "origin/%BRANCH%"
  if errorlevel 1 goto :failed
) else (
  git remote get-url origin >nul 2>&1
  if errorlevel 1 (
    git remote add origin "%REMOTE_URL%"
    if errorlevel 1 goto :failed
  ) else (
    git remote set-url origin "%REMOTE_URL%"
    if errorlevel 1 goto :failed
  )
)

echo [INFO] 加入本次同步檔案。
git add -- "*.html" "*.pdf" "assets" "%~nx0"
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
  echo [INFO] 建立同步提交。
  git commit -m "Sync health screening forms"
  if errorlevel 1 goto :failed
) else (
  echo [INFO] 本機沒有需要提交的新變更。
)

echo [INFO] 整合遠端更新。
git fetch origin "%BRANCH%"
if errorlevel 1 goto :failed

git rebase "origin/%BRANCH%"
if errorlevel 1 (
  echo [ERROR] Rebase 發生衝突。請解決衝突後執行 git rebase --continue，再重新執行本批次檔。
  goto :failed
)

echo [INFO] 推送至 %REMOTE_URL% 的 %BRANCH% 分支。
git push -u origin "%BRANCH%"
if errorlevel 1 goto :failed

echo [OK] GitHub 同步完成。
exit /b 0

:failed
echo [ERROR] GitHub 同步失敗，錯誤碼：%ERRORLEVEL%。
exit /b 1
