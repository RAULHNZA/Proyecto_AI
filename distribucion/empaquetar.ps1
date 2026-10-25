# Arma el paquete portatil de RED-i en entrega\RED-i y entrega\RED-i.zip.
# La otra laptop solo necesita Python: la pantalla va ya compilada y la sirve el backend.
#
# Uso (desde la raiz del proyecto, en PowerShell):
#   powershell -ExecutionPolicy Bypass -File distribucion\empaquetar.ps1            # incluye backend\.env con las llaves
#   powershell -ExecutionPolicy Bypass -File distribucion\empaquetar.ps1 -SinLlaves # sin llaves (se capturan al instalar)

param([switch]$SinLlaves)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'entrega\RED-i'
$zip = Join-Path $root 'entrega\RED-i.zip'

Write-Host '[1/4] Compilando la pantalla (frontend)...'
Push-Location (Join-Path $root 'frontend')
try {
    if (-not (Test-Path 'node_modules')) { npm install; if ($LASTEXITCODE) { throw 'npm install fallo' } }
    # Modo "portable" (frontend\.env.portable): la pantalla llama al mismo servidor que la sirve.
    npx vite build --mode portable
    if ($LASTEXITCODE) { throw 'La compilacion de la pantalla fallo' }
} finally {
    Pop-Location
}

Write-Host '[2/4] Copiando archivos...'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $out 'backend\contexto') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $out 'frontend') | Out-Null

Copy-Item (Join-Path $root 'backend\main.py'), (Join-Path $root 'backend\requirements.txt'), (Join-Path $root 'backend\.env.example') (Join-Path $out 'backend')
Copy-Item (Join-Path $root 'backend\contexto\*') (Join-Path $out 'backend\contexto') -Recurse
Copy-Item (Join-Path $root 'frontend\dist') (Join-Path $out 'frontend\dist') -Recurse
Copy-Item (Join-Path $root 'instalar.bat'), (Join-Path $root 'iniciar_red-i.bat'), (Join-Path $PSScriptRoot 'LEEME.txt') $out

$envFile = Join-Path $root 'backend\.env'
if (-not $SinLlaves -and (Test-Path $envFile)) {
    Copy-Item $envFile (Join-Path $out 'backend\.env')
    Write-Host '      Incluye backend\.env con las llaves: no compartas el paquete fuera del equipo.' -ForegroundColor Yellow
} else {
    Write-Host '      Sin llaves: instalar.bat creara backend\.env para capturarlas.'
}

Write-Host '[3/4] Comprimiendo...'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $out -DestinationPath $zip

Write-Host '[4/4] Listo:'
Write-Host "      Carpeta: $out"
Write-Host "      Zip:     $zip ($([math]::Round((Get-Item $zip).Length / 1MB, 1)) MB)"
