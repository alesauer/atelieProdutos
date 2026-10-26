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

# Carrega variaveis do .env se existir
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $varName = $parts[0].Trim()
            $varVal = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($varName, $varVal, "Process")
        }
    }
}

$DbName = if ($env:MYSQL_DATABASE) { $env:MYSQL_DATABASE } else { "casaluma_estoque" }
$DbUser = if ($env:MYSQL_USER) { $env:MYSQL_USER } else { "casaluma_user" }
$DbPass = if ($env:MYSQL_PASSWORD) { $env:MYSQL_PASSWORD } else { "casaluma_password" }
$ContainerDb = if ($env:CONTAINER_DB) { $env:CONTAINER_DB } else { "casaluma_db" }

# 1. Restaura banco (.sql ou .sql.gz)
$SqlGz = Get-ChildItem -Path $BackupPath -Filter "database_*.sql.gz" | Select-Object -First 1
$SqlPlain = Get-ChildItem -Path $BackupPath -Filter "database_*.sql" | Select-Object -First 1

$containerRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^$ContainerDb$"

if ($containerRunning) {
    if ($SqlGz) {
        Write-Host "-> Restaurando banco de dados a partir de $($SqlGz.FullName)..."
        python -c "import gzip, subprocess, sys; data = gzip.open(sys.argv[1], 'rb').read(); res = subprocess.run(['docker', 'exec', '-i', sys.argv[2], 'mysql', f'-u{sys.argv[3]}', f'-p{sys.argv[4]}', sys.argv[5]], input=data, capture_output=True); sys.exit(res.returncode)" "$($SqlGz.FullName)" "$ContainerDb" "$DbUser" "$DbPass" "$DbName"
        Write-Host "   [OK] Banco de dados restaurado no container $ContainerDb!" -ForegroundColor Green
    } elseif ($SqlPlain) {
        Write-Host "-> Restaurando banco de dados a partir de $($SqlPlain.FullName)..."
        Get-Content $SqlPlain.FullName | docker exec -i $ContainerDb mysql -u$DbUser -p$DbPass $DbName
        Write-Host "   [OK] Banco de dados restaurado no container $ContainerDb!" -ForegroundColor Green
    } else {
        Write-Host "   [AVISO] Nenhum arquivo de banco (.sql ou .sql.gz) encontrado em $BackupPath." -ForegroundColor Yellow
    }
} else {
    Write-Host "   [AVISO] Container $ContainerDb não está rodando." -ForegroundColor Yellow
}

# 2. Restaura mídias (.zip ou .tar.gz)
$ZipFile = Get-ChildItem -Path $BackupPath -Filter "media_*.zip" | Select-Object -First 1
$TarFile = Get-ChildItem -Path $BackupPath -Filter "media_*.tar.gz" | Select-Object -First 1

if (-not (Test-Path ".\media")) {
    New-Item -ItemType Directory -Path ".\media" | Out-Null
}

if ($ZipFile) {
    Write-Host "-> Restaurando mídias a partir de $($ZipFile.FullName)..."
    Expand-Archive -Path $ZipFile.FullName -DestinationPath ".\media" -Force
    Write-Host "   [OK] Mídias restauradas com sucesso em .\media!" -ForegroundColor Green
} elseif ($TarFile) {
    Write-Host "-> Restaurando mídias a partir de $($TarFile.FullName)..."
    python -c "import tarfile, sys; t = tarfile.open(sys.argv[1], 'r:gz'); t.extractall(sys.argv[2])" "$($TarFile.FullName)" ".\media"
    Write-Host "   [OK] Mídias restauradas com sucesso em .\media!" -ForegroundColor Green
}

# Copia mídias para dentro do container backend se estiver rodando
$backendRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^casaluma_backend$"
if ($backendRunning) {
    docker cp .\media\. casaluma_backend:/app/media/ 2>$null
    Write-Host "   [OK] Mídias sincronizadas com o container casaluma_backend!" -ForegroundColor Green
}

Write-Host "=== [Casa Luma] Restauração concluída! ===" -ForegroundColor Cyan
