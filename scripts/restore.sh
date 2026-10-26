#!/usr/bin/env bash
# ==============================================================================
# Ateliê Casa Luma — Script de Restauração (Restore)
# ==============================================================================
# Uso:
#   chmod +x scripts/restore.sh
#   ./scripts/restore.sh CAMINHO_DA_PASTA_DE_BACKUP
#
# Exemplo:
#   ./scripts/restore.sh ./backups/20261023_180000
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Erro: Forneça o caminho do diretório de backup a ser restaurado."
  echo "Exemplo: ./scripts/restore.sh ./backups/20261023_180000"
  exit 1
fi

BACKUP_PATH="$1"

if [ ! -d "${BACKUP_PATH}" ]; then
  echo "Erro: Pasta de backup não encontrada: ${BACKUP_PATH}"
  exit 1
fi

echo "=== [Casa Luma] Iniciando Restauração a partir de: ${BACKUP_PATH} ==="

if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

DB_NAME="${MYSQL_DATABASE:-casaluma_estoque}"
DB_USER="${MYSQL_USER:-casaluma_user}"
DB_PASS="${MYSQL_PASSWORD:-casaluma_password}"
CONTAINER_DB="${CONTAINER_DB:-casaluma_db}"

# 1. Localiza o dump do banco
SQL_FILE=$(find "${BACKUP_PATH}" -maxdepth 1 -name "database_*.sql.gz" | head -n 1)
if [ -z "${SQL_FILE}" ]; then
  echo "Erro: Arquivo database_*.sql.gz não encontrado em ${BACKUP_PATH}"
  exit 1
fi

echo "-> Restaurando banco de dados a partir de ${SQL_FILE}..."
if docker ps --format '{{.Names}}' | grep -q "${CONTAINER_DB}"; then
  gunzip -c "${SQL_FILE}" | docker exec -i "${CONTAINER_DB}" mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
  echo "   [OK] Banco de dados restaurado no container ${CONTAINER_DB}!"
else
  gunzip -c "${SQL_FILE}" | mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
  echo "   [OK] Banco de dados restaurado localmente!"
fi

# 2. Localiza o tarball de mídias
MEDIA_TAR=$(find "${BACKUP_PATH}" -maxdepth 1 -name "media_*.tar.gz" | head -n 1)
if [ -n "${MEDIA_TAR}" ]; then
  echo "-> Restaurando volume de mídias a partir de ${MEDIA_TAR}..."
  mkdir -p ./media
  tar -xzf "${MEDIA_TAR}" -C ./
  echo "   [OK] Mídias restauradas com sucesso em ./media!"
else
  echo "   [AVISO] Arquivo de mídia tar.gz não encontrado. Pulando restauração de mídias."
fi

echo "=== [Casa Luma] Restauração concluída com sucesso! ==="
