# Script para instalar o perfil do PowerShell com auto complete
# Execute este script no seu terminal PowerShell (VS Code)

$src = Join-Path $PSScriptRoot 'Microsoft.PowerShell_profile.ps1'
$dest = $PROFILE

if (-not (Test-Path $src)) {
    Write-Error "Arquivo de perfil não encontrado em: $src"
    exit 1
}

$destDir = Split-Path $dest
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Copy-Item -Path $src -Destination $dest -Force
Write-Host "✅ Perfil instalado com sucesso em:" -ForegroundColor Green
Write-Host $dest
Write-Host ""
Write-Host "Feche e reabra o terminal do VS Code para aplicar as configurações." -ForegroundColor Yellow
