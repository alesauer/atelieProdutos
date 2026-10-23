# ==============================================================================
# Ateliê Casa Luma — Script de Restauração para Windows / PowerShell
# ==============================================================================
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
    Write-Host "Erro: Diretório de backup não encontrado: $BackupPath" -ForegroundColor Red
    exit 1
}

Write-Host "=== [Casa Luma] Iniciando Restauração a partir de: $BackupPath ===" -ForegroundColor Cyan

$DbName = "casaluma_estoque"
$DbUser = "casaluma_user"
$DbPass = "casaluma_password"
$ContainerDb = "casaluma_db"

# 1. Restaura banco
$SqlFile = Get-ChildItem -Path $BackupPath -Filter "database_*.sql" | Select-Object -First 1
if ($SqlFile) {
    Write-Host "-> Restaurando banco de dados a partir de $($SqlFile.FullName)..."
    $containerRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^$ContainerDb$"
    if ($containerRunning) {
        Get-Content $SqlFile.FullName | docker exec -i $ContainerDb mysql -u$DbUser -p$DbPass $DbName
        Write-Host "   [OK] Banco de dados restaurado no container $ContainerDb!" -ForegroundColor Green
    } else {
        Write-Host "   [AVISO] Container $ContainerDb não está rodando." -ForegroundColor Yellow
    }
}

# 2. Restaura mídias
$ZipFile = Get-ChildItem -Path $BackupPath -Filter "media_*.zip" | Select-Object -First 1
if ($ZipFile) {
    Write-Host "-> Restaurando mídias a partir de $($ZipFile.FullName)..."
    if (-not (Test-Path ".\media")) {
        New-Item -ItemType Directory -Path ".\media" | Out-Null
    }
    Expand-Archive -Path $ZipFile.FullName -DestinationPath ".\media" -Force
    Write-Host "   [OK] Mídias restauradas com sucesso em .\media!" -ForegroundColor Green
}

Write-Host "=== [Casa Luma] Restauração concluída! ===" -ForegroundColor Cyan
