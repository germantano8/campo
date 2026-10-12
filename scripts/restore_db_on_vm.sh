#!/bin/bash
# ==============================================================================
# Script para restaurar el volcado de la BD en el contenedor Docker de Azure VM
# ==============================================================================
set -e

BACKUP_FILE="${1:-backups/campo_backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de backup en $BACKUP_FILE"
    echo "Uso: ./scripts/restore_db_on_vm.sh [ruta_al_archivo.sql]"
    exit 1
fi

# Cargar variables del .env si existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-mislotes}

echo "⏳ Restaurando base de datos en el contenedor Docker 'campo_db'..."
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

echo "✅ Restauración completada con éxito."
