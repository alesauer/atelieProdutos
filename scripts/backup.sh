#!/usr/bin/env bash
# ==============================================================================
# Ateliê Casa Luma — Script de Backup Automatizado (Banco de Dados + Mídias)
# ==============================================================================
# Uso:
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh [DIRETORIO_DESTINO]
#
# Exemplo em cronjob (diário às 03:00):
#   0 3 * * * /caminho/casaluma/scripts/backup.sh /var/backups/casaluma >> /var/log/casaluma-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

echo "=== [Casa Luma] Iniciando rotina de backup: ${TIMESTAMP} ==="
mkdir -p "${BACKUP_PATH}"

# 1. Carrega variáveis de ambiente se o arquivo .env existir
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

DB_NAME="${MYSQL_DATABASE:-casaluma_estoque}"
DB_USER="${MYSQL_USER:-casaluma_user}"
DB_PASS="${MYSQL_PASSWORD:-casaluma_password}"
CONTAINER_DB="${CONTAINER_DB:-casaluma_db}"

# 2. Dump do Banco de Dados MySQL
echo "-> Exportando banco de dados MySQL (${DB_NAME})..."
if docker ps --format '{{.Names}}' | grep -q "${CONTAINER_DB}"; then
  docker exec "${CONTAINER_DB}" mysqldump \
    -u"${DB_USER}" \
    -p"${DB_PASS}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "${DB_NAME}" | gzip > "${BACKUP_PATH}/database_${TIMESTAMP}.sql.gz"
  echo "   [OK] Banco exportado em: ${BACKUP_PATH}/database_${TIMESTAMP}.sql.gz"
else
  echo "   [AVISO] Container ${CONTAINER_DB} não está em execução. Tentando mysqldump local..."
  mysqldump -u"${DB_USER}" -p"${DB_PASS}" --single-transaction --quick "${DB_NAME}" | gzip > "${BACKUP_PATH}/database_${TIMESTAMP}.sql.gz"
fi

# 3. Compactação do Volume de Mídias (Fotos de Produtos em alta/miniatura)
echo "-> Compactando volume de mídias..."
if [ -d "./media" ]; then
  tar -czf "${BACKUP_PATH}/media_${TIMESTAMP}.tar.gz" -C ./ media
  echo "   [OK] Mídias compactadas em: ${BACKUP_PATH}/media_${TIMESTAMP}.tar.gz"
elif docker volume inspect casaluma_media_data >/dev/null 2>&1; then
  docker run --rm \
    -v casaluma_media_data:/media_vol:ro \
    -v "${PWD}/${BACKUP_PATH}":/backup \
    alpine tar -czf "/backup/media_${TIMESTAMP}.tar.gz" -C /media_vol .
  echo "   [OK] Volume Docker de mídias copiado em: ${BACKUP_PATH}/media_${TIMESTAMP}.tar.gz"
else
  echo "   [INFO] Diretório de mídia não encontrado localmente. Criando arquivo de manifesto vazio."
  touch "${BACKUP_PATH}/media_empty.txt"
fi

# 4. Criação do arquivo de metadados do backup
cat <<EOF > "${BACKUP_PATH}/manifest.json"
{
  "timestamp": "${TIMESTAMP}",
  "database": "database_${TIMESTAMP}.sql.gz",
  "media": "media_${TIMESTAMP}.tar.gz",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "system": "Casa Luma Estoque v0.1.0"
}
EOF

# 5. Rotação de backups antigos (mantém últimos 14 dias por padrão)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
echo "-> Removendo backups com mais de ${RETENTION_DAYS} dias..."
find "${BACKUP_DIR}" -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true

echo "=== [Casa Luma] Backup concluído com sucesso em: ${BACKUP_PATH} ==="
