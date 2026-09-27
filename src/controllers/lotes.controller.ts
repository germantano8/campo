import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export class LotesController {
  /**
   * Obtiene todos los lotes, con filtro opcional por régimen y datos del propietario
   */
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { regimen, propietarioId } = req.query;

      const where: any = {};
      if (regimen) where.regimen = String(regimen);
      if (propietarioId) where.propietarioId = BigInt(String(propietarioId));

      const lotes = await prisma.lote.findMany({
        where,
        include: {
          propietario: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              telefono: true,
              cbu: true,
            },
          },
          _count: {
            select: { trabajos: true },
          },
        },
        orderBy: { nombre: 'asc' },
      });
      res.json(lotes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el detalle de un lote por ID, incluyendo su historial de trabajos y propietario
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const lote = await prisma.lote.findUnique({
        where: { id },
        include: {
          propietario: true,
          trabajos: {
            include: {
              siembra: { include: { cultivo: true } },
              fumigacion: { include: { cultivo: true } },
              cosecha: { include: { cultivo: true } },
            },
            orderBy: { fecha: 'desc' },
          },
        },
      });

      if (!lote) {
        res.status(404).json({ error: 'Lote no encontrado' });
        return;
      }

      res.json(lote);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra un nuevo lote con su régimen de tenencia (PROPIO, ALQUILADO, SERVICIO_TERCERO)
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        nombre,
        hectareas,
        regimen,
        propietarioId,
        modalidadAlquiler,
        valorAlquiler,
      } = req.body;

      const nuevoLote = await prisma.lote.create({
        data: {
          nombre,
          hectareas,
          regimen: regimen || 'PROPIO',
          propietarioId: propietarioId ? BigInt(propietarioId) : null,
          modalidadAlquiler: modalidadAlquiler || null,
          valorAlquiler: valorAlquiler ? valorAlquiler : null,
        },
        include: {
          propietario: true,
        },
      });

      res.status(201).json(nuevoLote);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza los datos de un lote
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const {
        nombre,
        hectareas,
        regimen,
        propietarioId,
        modalidadAlquiler,
        valorAlquiler,
      } = req.body;

      const loteActualizado = await prisma.lote.update({
        where: { id },
        data: {
          nombre,
          hectareas,
          regimen,
          propietarioId: propietarioId !== undefined ? (propietarioId ? BigInt(propietarioId) : null) : undefined,
          modalidadAlquiler: modalidadAlquiler !== undefined ? modalidadAlquiler : undefined,
          valorAlquiler: valorAlquiler !== undefined ? valorAlquiler : undefined,
        },
        include: {
          propietario: true,
        },
      });

      res.json(loteActualizado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un lote (si no posee trabajos históricos)
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));

      await prisma.lote.delete({
        where: { id },
      });

      res.json({ message: 'Lote eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
