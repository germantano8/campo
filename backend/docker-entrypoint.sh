#!/bin/sh
set -e

echo "=========================================================="
echo "🌱 Iniciando Backend de Campo..."
echo "=========================================================="

echo "⏳ Sincronizando esquema de base de datos con Prisma..."
npx prisma db push --skip-generate

echo "🚀 Iniciando servidor Express en puerto ${PORT:-3000}..."
exec node dist/index.js
