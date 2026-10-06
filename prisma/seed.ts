import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos de prueba...');

  // 1. Cultivos
  const soja = await prisma.cultivo.upsert({
    where: { nombre: 'Soja' },
    update: {},
    create: { nombre: 'Soja' },
  });

  const maiz = await prisma.cultivo.upsert({
    where: { nombre: 'Maíz' },
    update: {},
    create: { nombre: 'Maíz' },
  });

  const trigo = await prisma.cultivo.upsert({
    where: { nombre: 'Trigo' },
    update: {},
    create: { nombre: 'Trigo' },
  });

  await prisma.cultivo.upsert({
    where: { nombre: 'Girasol' },
    update: {},
    create: { nombre: 'Girasol' },
  });

  console.log('✅ Cultivos listos (Soja, Maíz, Trigo, Girasol)');

  // 2. Terceros
  let dueno1 = await prisma.tercero.findFirst({
    where: { numeroDocumento: '20-12345678-9' },
  });
  if (!dueno1) {
    dueno1 = await prisma.tercero.create({
      data: {
        nombre: 'Don Juan Pérez',
        tipo: 'PROPIETARIO',
        tipoDocumento: 'CUIT',
        numeroDocumento: '20-12345678-9',
        telefono: '0341-155123456',
        email: 'juan.perez@campo.com',
        direccion: 'Ruta 9 Km 280, Armstrong',
        cbu: '0110123430000012345678',
      },
    });
  }

  let dueno2 = await prisma.tercero.findFirst({
    where: { numeroDocumento: '30-87654321-4' },
  });
  if (!dueno2) {
    dueno2 = await prisma.tercero.create({
      data: {
        nombre: 'La Chaqueña S.A.',
        tipo: 'PROPIETARIO',
        tipoDocumento: 'CUIT',
        numeroDocumento: '30-87654321-4',
        telefono: '0342-4567890',
        email: 'contacto@lachaguena.com',
        direccion: 'Av. Libertador 450, Rosario',
        cbu: '0720123488000098765432',
      },
    });
  }

  let clienteContratista = await prisma.tercero.findFirst({
    where: { numeroDocumento: '30-55443322-1' },
  });
  if (!clienteContratista) {
    clienteContratista = await prisma.tercero.create({
      data: {
        nombre: 'Agroservicios El Trébol',
        tipo: 'CLIENTE',
        tipoDocumento: 'CUIT',
        numeroDocumento: '30-55443322-1',
        telefono: '03471-420000',
        email: 'administracion@eltrebolagro.com',
        direccion: 'Parque Industrial Lote 12, Cañada de Gómez',
      },
    });
  }

  console.log('✅ Terceros listos');

  // 3. Lotes
  const lote1 = await prisma.lote.upsert({
    where: { nombre: 'Lote 1 - Las Palmeras' },
    update: {},
    create: {
      nombre: 'Lote 1 - Las Palmeras',
      hectareas: 120.5,
      regimen: 'PROPIO',
    },
  });

  await prisma.lote.upsert({
    where: { nombre: 'Lote 2 - Don Juan' },
    update: {},
    create: {
      nombre: 'Lote 2 - Don Juan',
      hectareas: 85.0,
      regimen: 'ALQUILADO',
      propietarioId: dueno1.id,
      modalidadAlquiler: 'PORCENTAJE',
      valorAlquiler: 18.0, // 18% a cosecha
    },
  });

  await prisma.lote.upsert({
    where: { nombre: 'Lote 3 - La Chaqueña' },
    update: {},
    create: {
      nombre: 'Lote 3 - La Chaqueña',
      hectareas: 210.0,
      regimen: 'ALQUILADO',
      propietarioId: dueno2.id,
      modalidadAlquiler: 'QUINTALES_FIJOS',
      valorAlquiler: 12.5, // 12.5 qq/ha
    },
  });

  await prisma.lote.upsert({
    where: { nombre: 'Lote 4 - Servicio Terceros' },
    update: {},
    create: {
      nombre: 'Lote 4 - Servicio Terceros',
      hectareas: 160.0,
      regimen: 'SERVICIO_TERCERO',
      propietarioId: clienteContratista.id,
    },
  });

  console.log('✅ Lotes creados (Propios, Alquilados y de Terceros)');

  // 4. Labores / Trabajos en Lote 1
  const countTrabajos = await prisma.trabajo.count({ where: { loteId: lote1.id } });
  if (countTrabajos === 0) {
    await prisma.trabajo.create({
      data: {
        loteId: lote1.id,
        tipo: 'SIEMBRA',
        fecha: new Date('2026-04-10'),
        hectareas: 120.5,
        observaciones: 'Siembra directa de Soja de primera',
        siembra: {
          create: {
            cultivoId: soja.id,
            variedadSemilla: 'DM 46i20 IPRO',
          },
        },
      },
    });

    await prisma.trabajo.create({
      data: {
        loteId: lote1.id,
        tipo: 'FUMIGACION',
        fecha: new Date('2026-05-15'),
        hectareas: 120.5,
        observaciones: 'Aplicación de herbicida posemergente',
        fumigacion: {
          create: {
            cultivoId: soja.id,
          },
        },
      },
    });

    await prisma.trabajo.create({
      data: {
        loteId: lote1.id,
        tipo: 'COSECHA',
        fecha: new Date('2026-08-20'),
        hectareas: 120.5,
        observaciones: 'Cosecha campaña gruesa excelente estado',
        cosecha: {
          create: {
            cultivoId: soja.id,
            rendimiento: 38.5, // 38.5 qq/ha
          },
        },
      },
    });
    console.log('✅ Trabajos y labores cargados en Lote 1');
  }

  // 5. Acopio de cereal para Don Juan Pérez
  const countMovimientos = await prisma.movimientoCereal.count({ where: { terceroId: dueno1.id } });
  if (countMovimientos === 0) {
    // Ingreso de cosecha
    await prisma.movimientoCereal.create({
      data: {
        terceroId: dueno1.id,
        cultivoId: soja.id,
        tipo: 'INGRESO_COSECHA',
        cantidadKg: 65000,
        fecha: new Date('2026-08-25'),
        observaciones: 'Ingreso al silo de acopio - Campaña 2026',
      },
    });

    // Liquidación parcial de 20.000 kg con Comprobante
    const comprobanteVenta = await prisma.comprobante.create({
      data: {
        terceroId: dueno1.id,
        direccion: 'RECIBIDA',
        tipoComprobante: 'LIQUIDACION',
        fechaEmision: new Date('2026-09-01'),
        subtotal: 6400000,
        total: 6400000,
        observaciones: 'Liquidación de 20.000 kg de Soja @ $320/kg',
      },
    });

    await prisma.movimientoCereal.create({
      data: {
        terceroId: dueno1.id,
        cultivoId: soja.id,
        tipo: 'VENTA_LIQUIDACION',
        cantidadKg: -20000,
        fecha: new Date('2026-09-01'),
        comprobanteId: comprobanteVenta.id,
        observaciones: 'Liquidación de granos vinculada al comprobante',
      },
    });

    console.log('✅ Movimientos de cereal y comprobante de prueba cargados');
  }

  console.log('🎉 Carga inicial completada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

