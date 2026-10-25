@echo off
REM Abre RED-i: arranca el servidor local y el navegador en http://127.0.0.1:8000
REM Para cerrar RED-i, cierra esta ventana (o presiona Ctrl+C).
chcp 65001 >nul
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo Primero ejecuta instalar.bat
  pause
  exit /b 1
)

echo.
echo   RED-i esta corriendo en http://127.0.0.1:8000
echo   No cierres esta ventana mientras se use RED-i.
echo.

REM Abre el navegador cuando el servidor ya este listo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://127.0.0.1:8000'"

REM Solo escucha en esta computadora (127.0.0.1): no queda expuesto a la red.
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
