const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const terceroId = BigInt(1);
    const saldos = await prisma.$queryRaw`
      SELECT 
        c.id AS cultivo_id,
        c.nombre AS cultivo_nombre,
        COALESCE(SUM(m.cantidad_kg), 0) AS saldo_kg
      FROM agricultura.cultivos c
      JOIN agricultura.movimientos_cereal m ON m.cultivo_id = c.id
      WHERE m.tercero_id = ${terceroId}
      GROUP BY c.id, c.nombre
      HAVING COALESCE(SUM(m.cantidad_kg), 0) <> 0
      ORDER BY c.nombre ASC;
    `;
    console.log('JSON.stringify without prototype:');
    try {
      console.log(JSON.stringify(saldos));
    } catch (e) {
      console.log('Error serializing:', e.message);
    }
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
