#!/bin/bash
# ==============================================================================
# Script para exportar la base de datos PostgreSQL local en Bash / WSL / Linux
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$DIR/../backups"
BACKUP_FILE="$DIR/../backups/campo_backup.sql"

echo "⏳ Exportando esquema 'agricultura' y datos desde PostgreSQL local..."
pg_dump -U postgres -h localhost -p 5432 -d campo -n agricultura --clean --if-exists -f "$BACKUP_FILE"

echo "✅ Backup completado con éxito en: $BACKUP_FILE"
