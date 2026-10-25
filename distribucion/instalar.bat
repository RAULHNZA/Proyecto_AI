@echo off
REM Instalacion de RED-i en una laptop nueva. Solo se ejecuta una vez.
REM Requisitos: Windows 10/11, Python 3.10 o superior e internet (descarga las librerias de Python).
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ==============================================
echo   RED-i - Instalacion
echo ==============================================
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY goto :sinpython

%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>nul
if errorlevel 1 goto :sinpython

echo [1/3] Creando entorno de Python en backend\.venv ...
if not exist "backend\.venv\Scripts\python.exe" (
  %PY% -m venv backend\.venv
  if errorlevel 1 goto :error
)

echo [2/3] Instalando librerias (puede tardar un par de minutos) ...
backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -q --upgrade pip
backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 goto :error

echo [3/3] Revisando llaves ...
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo   Se creo backend\.env : abrelo con el Bloc de notas y escribe la llave GROQ_API_KEY.
) else (
  echo   backend\.env ya existe.
)

echo.
echo Instalacion terminada. Para abrir RED-i ejecuta: iniciar_red-i.bat
echo.
pause
exit /b 0

:sinpython
echo No se encontro Python 3.10 o superior.
echo Instalalo desde https://www.python.org/downloads/ (o pidelo a TI / Centro de software)
echo y marca la casilla "Add python.exe to PATH". Despues vuelve a ejecutar instalar.bat
echo.
pause
exit /b 1

:error
echo.
echo Algo fallo durante la instalacion. Revisa el mensaje de arriba
echo (lo mas comun: sin internet o un proxy que bloquea pypi.org).
echo.
pause
exit /b 1
