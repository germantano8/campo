const fs = require('fs');
const path = require('path');

const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');

// Cargar variables de entorno del backend si existe
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  try {
    const dotenv = require(path.join(backendNodeModules, 'dotenv'));
    dotenv.config({ path: envPath });
  } catch (e) {
    // Si no está dotenv, parsear manualmente líneas simples
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w_]+)\s*=\s*"?([^"\r\n]+)"?/);
      if (match) process.env[match[1]] = match[2];
    });
  }
}
const { PrismaClient } = require(path.join(backendNodeModules, '@prisma/client'));

const prisma = new PrismaClient();

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'bigint') return val.toString();
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object' && val.d) {
    // Prisma Decimal
    return val.toString();
  }
  // Cadena de texto
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function formatDate(date) {
  if (!date) return 'NULL';
  if (date instanceof Date) {
    return `'${date.toISOString().split('T')[0]}'`;
  }
  return `'${String(date)}'`;
}

async function exportDatabase() {
  console.log('⏳ Conectando a PostgreSQL y leyendo datos del esquema agricultura...');
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, 'campo_backup.sql');

  const sqlLines = [];
  sqlLines.push('-- ==============================================================================');
  sqlLines.push('-- Backup generado automáticamente por Campo Exporter');
  sqlLines.push(`-- Fecha: ${new Date().toISOString()}`);
  sqlLines.push('-- ==============================================================================\n');
  sqlLines.push('CREATE SCHEMA IF NOT EXISTS agricultura;\n');
  sqlLines.push('SET search_path TO agricultura, public;\n');

  // Tablas en orden estricto de dependencias
  const tables = [
    {
      name: 'terceros',
      model: 'tercero',
      cols: ['id', 'nombre', 'tipo_documento', 'numero_documento', 'tipo', 'email', 'telefono', 'cbu', 'direccion', 'created_at'],
      map: r => [r.id, r.nombre, r.tipoDocumento, r.numeroDocumento, r.tipo, r.email, r.telefono, r.cbu, r.direccion, r.createdAt]
    },
    {
      name: 'cultivos',
      model: 'cultivo',
      cols: ['id', 'nombre', 'created_at'],
      map: r => [r.id, r.nombre, r.createdAt]
    },
    {
      name: 'lotes',
      model: 'lote',
      cols: ['id', 'nombre', 'hectareas', 'regimen', 'propietario_id', 'modalidad_alquiler', 'valor_alquiler', 'created_at'],
      map: r => [r.id, r.nombre, r.hectareas, r.regimen, r.propietarioId, r.modalidadAlquiler, r.valorAlquiler, r.createdAt]
    },
    {
      name: 'trabajos',
      model: 'trabajo',
      cols: ['id', 'lote_id', 'tipo', 'fecha', 'hectareas', 'observaciones', 'created_at'],
      map: r => [r.id, r.loteId, r.tipo, formatDate(r.fecha), r.hectareas, r.observaciones, r.createdAt],
      rawDates: true
    },
    {
      name: 'siembras',
      model: 'siembra',
      cols: ['id', 'trabajo_id', 'cultivo_id', 'variedad_semilla', 'created_at'],
      map: r => [r.id, r.trabajoId, r.cultivoId, r.variedadSemilla, r.createdAt]
    },
    {
      name: 'fumigaciones',
      model: 'fumigacion',
      cols: ['id', 'trabajo_id', 'cultivo_id', 'created_at'],
      map: r => [r.id, r.trabajoId, r.cultivoId, r.createdAt]
    },
    {
      name: 'cosechas',
      model: 'cosecha',
      cols: ['id', 'trabajo_id', 'cultivo_id', 'rendimiento', 'created_at'],
      map: r => [r.id, r.trabajoId, r.cultivoId, r.rendimiento, r.createdAt]
    },
    {
      name: 'comprobantes',
      model: 'comprobante',
      cols: ['id', 'tercero_id', 'direccion', 'tipo_comprobante', 'fecha_emision', 'moneda', 'subtotal', 'iva', 'total', 'observaciones', 'trabajo_id', 'created_at'],
      map: r => [r.id, r.terceroId, r.direccion, r.tipoComprobante, formatDate(r.fechaEmision), r.moneda, r.subtotal, r.iva, r.total, r.observaciones, r.trabajoId, r.createdAt],
      rawDates: true
    },
    {
      name: 'movimientos_cereal',
      model: 'movimientoCereal',
      cols: ['id', 'tercero_id', 'cultivo_id', 'tipo', 'cantidad_kg', 'cosecha_id', 'comprobante_id', 'fecha', 'observaciones', 'created_at'],
      map: r => [r.id, r.terceroId, r.cultivoId, r.tipo, r.cantidadKg, r.cosechaId, r.comprobanteId, formatDate(r.fecha), r.observaciones, r.createdAt],
      rawDates: true
    },
    {
      name: 'archivos_adjuntos',
      model: 'archivoAdjunto',
      cols: ['id', 'nombre_original', 'nombre_almacenado', 'mime_type', 'storage_provider', 'storage_path', 'url_publica', 'comprobante_id', 'trabajo_id', 'created_at'],
      map: r => [r.id, r.nombreOriginal, r.nombreAlmacenado, r.mimeType, r.storageProvider, r.storagePath, r.urlPublica, r.comprobanteId, r.trabajoId, r.createdAt]
    }
  ];

  let totalRegistros = 0;

  for (const t of tables) {
    const rows = await prisma[t.model].findMany();
    console.log(`📦 Tabla '${t.name}': ${rows.length} registros encontrados.`);
    totalRegistros += rows.length;

    if (rows.length > 0) {
      sqlLines.push(`-- Datos para la tabla: agricultura.${t.name}`);
      for (const row of rows) {
        const values = t.map(row).map(val => {
          if (typeof val === 'string' && (val.startsWith("'") || val === 'NULL')) return val;
          return escapeSqlValue(val);
        });
        sqlLines.push(`INSERT INTO agricultura.${t.name} (${t.cols.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
      }
      sqlLines.push(`SELECT setval(pg_get_serial_sequence('agricultura.${t.name}', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM agricultura.${t.name};\n`);
    }
  }

  fs.writeFileSync(backupFile, sqlLines.join('\n'), 'utf8');
  console.log('\n==============================================================');
  console.log(`✅ Backup generado con éxito: ${totalRegistros} registros exportados.`);
  console.log(`📁 Archivo: ${backupFile}`);
  console.log('==============================================================\n');
}

exportDatabase()
  .catch(err => {
    console.error('❌ Error durante la exportación:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
