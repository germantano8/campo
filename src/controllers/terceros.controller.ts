import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export class TercerosController {
  /**
   * Obtiene todos los terceros (clientes y propietarios), con filtro opcional por tipo
   */
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo } = req.query;

      const where: any = {};
      if (tipo) where.tipo = String(tipo); // 'PROPIETARIO' | 'CLIENTE' | 'AMBOS'

      const terceros = await prisma.tercero.findMany({
        where,
        include: {
          lotes: {
            select: {
              id: true,
              nombre: true,
              hectareas: true,
              regimen: true,
            },
          },
          _count: {
            select: { comprobantes: true, movimientosCereal: true },
          },
        },
        orderBy: { nombre: 'asc' },
      });
      res.json(terceros);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el detalle de un tercero por ID incluyendo lotes, comprobantes y movimientos
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const tercero = await prisma.tercero.findUnique({
        where: { id },
        include: {
          lotes: true,
          comprobantes: {
            include: {
              archivosAdjuntos: true,
            },
            orderBy: { fechaEmision: 'desc' },
          },
          movimientosCereal: {
            include: {
              cultivo: true,
            },
            orderBy: { fecha: 'desc' },
          },
        },
      });

      if (!tercero) {
        res.status(404).json({ error: 'Tercero no encontrado' });
        return;
      }

      res.json(tercero);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra un nuevo tercero (cliente, propietario o ambos)
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        nombre,
        tipoDocumento,
        numeroDocumento,
        tipo,
        email,
        telefono,
        cbu,
        direccion,
      } = req.body;

      const nuevoTercero = await prisma.tercero.create({
        data: {
          nombre,
          tipoDocumento,
          numeroDocumento,
          tipo: tipo || 'CLIENTE',
          email,
          telefono,
          cbu,
          direccion,
        },
      });

      res.status(201).json(nuevoTercero);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza los datos de un tercero
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const {
        nombre,
        tipoDocumento,
        numeroDocumento,
        tipo,
        email,
        telefono,
        cbu,
        direccion,
      } = req.body;

      const terceroActualizado = await prisma.tercero.update({
        where: { id },
        data: {
          nombre,
          tipoDocumento,
          numeroDocumento,
          tipo,
          email,
          telefono,
          cbu,
          direccion,
        },
      });

      res.json(terceroActualizado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un tercero (si no tiene comprobantes ni movimientos de cereal vinculados)
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));

      await prisma.tercero.delete({
        where: { id },
      });

      res.json({ message: 'Tercero eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
