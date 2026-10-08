import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export class CultivosController {
  /**
   * Obtiene todos los cultivos ordenados alfabéticamente
   */
  public static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cultivos = await prisma.cultivo.findMany({
        orderBy: { nombre: 'asc' },
        include: {
          _count: {
            select: {
              siembras: true,
              cosechas: true,
              fumigaciones: true,
              movimientosCereal: true,
            },
          },
        },
      });
      res.json(cultivos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un cultivo específico por ID
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const cultivo = await prisma.cultivo.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              siembras: true,
              cosechas: true,
              fumigaciones: true,
              movimientosCereal: true,
            },
          },
        },
      });

      if (!cultivo) {
        res.status(404).json({ error: 'Cultivo no encontrado' });
        return;
      }

      res.json(cultivo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra un nuevo cultivo (ej: Soja, Maíz, Trigo, Girasol)
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombre } = req.body;

      const existente = await prisma.cultivo.findUnique({
        where: { nombre },
      });

      if (existente) {
        res.status(400).json({ error: `El cultivo '${nombre}' ya existe.` });
        return;
      }

      const nuevoCultivo = await prisma.cultivo.create({
        data: { nombre },
      });

      res.status(201).json(nuevoCultivo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza el nombre de un cultivo
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const { nombre } = req.body;

      const cultivoActualizado = await prisma.cultivo.update({
        where: { id },
        data: { nombre },
      });

      res.json(cultivoActualizado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un cultivo (siempre que no tenga trabajos o movimientos asociados)
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));

      await prisma.cultivo.delete({
        where: { id },
      });

      res.json({ message: 'Cultivo eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
