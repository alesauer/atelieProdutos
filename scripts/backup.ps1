# ==============================================================================
# Ateliê Casa Luma — Script de Backup Automatizado para Windows / PowerShell
# ==============================================================================
param (
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = Join-Path $BackupDir $Timestamp

Write-Host "=== [Casa Luma] Iniciando rotina de backup: $Timestamp ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

$DbName = "casaluma_estoque"
$DbUser = "casaluma_user"
$DbPass = "casaluma_password"
$ContainerDb = "casaluma_db"

# 1. Backup do Banco via Docker ou local
Write-Host "-> Exportando banco de dados MySQL ($DbName)..."
$SqlFile = Join-Path $BackupPath "database_$Timestamp.sql"

$containerRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^$ContainerDb$"
if ($containerRunning) {
    docker exec $ContainerDb mysqldump -u$DbUser -p$DbPass --single-transaction --quick $DbName > $SqlFile
    Write-Host "   [OK] Banco exportado em: $SqlFile" -ForegroundColor Green
} else {
    Write-Host "   [AVISO] Container $ContainerDb não está rodando. Verifique se o Docker está ativo." -ForegroundColor Yellow
}

# 2. Backup de Mídias
Write-Host "-> Compactando pasta de mídias..."
if (Test-Path ".\media") {
    $ZipFile = Join-Path $BackupPath "media_$Timestamp.zip"
    Compress-Archive -Path ".\media\*" -DestinationPath $ZipFile -Force
    Write-Host "   [OK] Mídias compactadas em: $ZipFile" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Pasta .\media não existe no momento." -ForegroundColor Gray
}

# 3. Manifesto JSON
$Manifest = @{
    timestamp = $Timestamp
    database = "database_$Timestamp.sql"
    media = "media_$Timestamp.zip"
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    system = "Casa Luma Estoque v0.1.0"
}
$Manifest | ConvertTo-Json | Out-File (Join-Path $BackupPath "manifest.json") -Encoding utf8

Write-Host "=== [Casa Luma] Backup concluído com sucesso em: $BackupPath ===" -ForegroundColor Cyan
