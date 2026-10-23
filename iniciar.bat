@echo off
REM Arranca backend y frontend en ventanas propias y abre el navegador.
REM Cierra esas dos ventanas para detener la aplicacion.

start "Backend - Asistente de Voz" /D "%~dp0backend" cmd /k .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
start "Frontend - Asistente de Voz" /D "%~dp0frontend" cmd /k npm run dev

echo Esperando a que arranquen los servidores...
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
