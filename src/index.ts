import dotenv from 'dotenv';
// Cargar variables de entorno antes que cualquier otra importación
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { prisma } from './lib/prisma';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Middlewares globales
app.use(express.json());

// Servir archivos estáticos locales de adjuntos
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Rutas de la API modularizadas
app.use('/api', apiRouter);

// Endpoint de salud del servicio
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Verificación de conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'campo-backend',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'campo-backend',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
});

// Middleware centralizado de manejo de errores (siempre al final)
app.use(errorHandler);

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📡 Endpoint de salud disponible en http://localhost:${port}/health`);
  console.log(`📁 Rutas API montadas en /api (terceros, lotes, comprobantes, acopio)`);
});
