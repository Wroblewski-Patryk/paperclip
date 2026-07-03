@echo off
setlocal
set "ROOT=%~dp0.."
node "%ROOT%\node_modules\@openai\codex\bin\codex.js" %*
