@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py iniciar_painel.py
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python iniciar_painel.py
  goto :eof
)
echo Python nao encontrado. Instale o Python 3 para iniciar o painel.
pause
