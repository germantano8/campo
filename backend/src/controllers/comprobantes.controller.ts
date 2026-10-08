import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { StorageService } from '../lib/storage';

export class ComprobantesController {
  /**
   * Obtiene todos los comprobantes, con filtros opcionales por tercero y dirección (EMITIDA / RECIBIDA)
   */
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { terceroId, direccion } = req.query;

      const where: any = {};
      if (terceroId) where.terceroId = BigInt(terceroId as string);
      if (direccion) where.direccion = direccion as string;

      const comprobantes = await prisma.comprobante.findMany({
        where,
        include: {
          tercero: {
            select: {
              id: true,
              nombre: true,
              cbu: true,
            },
          },
          archivosAdjuntos: true,
        },
        orderBy: { fechaEmision: 'desc' },
      });

      res.json(comprobantes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el detalle de un comprobante con sus archivos adjuntos
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const comprobante = await prisma.comprobante.findUnique({
        where: { id },
        include: {
          tercero: true,
          trabajo: true,
          archivosAdjuntos: true,
          movimientosCereal: true,
        },
      });

      if (!comprobante) {
        res.status(404).json({ error: 'Comprobante no encontrado' });
        return;
      }

      res.json(comprobante);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra un nuevo comprobante (factura emitida a cliente o recibida de dueño)
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        terceroId,
        direccion,
        tipoComprobante,
        fechaEmision,
        moneda,
        subtotal,
        iva,
        total,
        observaciones,
        trabajoId,
      } = req.body;

      const subtotalNum = subtotal !== undefined && subtotal !== null && subtotal !== '' ? Number(subtotal) : Number(total);
      const ivaNum = iva !== undefined && iva !== null && iva !== '' ? Number(iva) : 0;
      const totalNum = Number(total);

      const comprobante = await prisma.$transaction(async (tx) => {
        const nuevo = await tx.comprobante.create({
          data: {
            terceroId: BigInt(terceroId),
            direccion,
            tipoComprobante,
            fechaEmision: new Date(fechaEmision),
            moneda: moneda || 'ARS',
            subtotal: subtotalNum,
            iva: ivaNum,
            total: totalNum,
            observaciones: observaciones || null,
            trabajoId: trabajoId && trabajoId !== '' ? BigInt(trabajoId) : null,
          },
          include: {
            tercero: true,
          },
        });

        if (req.file) {
          const uploaded = await StorageService.uploadFile(req.file, 'comprobantes');
          await tx.archivoAdjunto.create({
            data: {
              nombreOriginal: uploaded.nombreOriginal,
              nombreAlmacenado: uploaded.nombreAlmacenado,
              mimeType: uploaded.mimeType,
              storageProvider: uploaded.storageProvider,
              storagePath: uploaded.storagePath,
              urlPublica: uploaded.urlPublica || null,
              comprobanteId: nuevo.id,
            },
          });
        }

        return tx.comprobante.findUnique({
          where: { id: nuevo.id },
          include: {
            tercero: true,
            archivosAdjuntos: true,
          },
        });
      });

      res.status(201).json(comprobante);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sube un archivo adjunto (PDF o imagen) y lo asocia al comprobante
   */
  public static async uploadAdjunto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const comprobanteId = BigInt(String(req.params.id));

      const comprobante = await prisma.comprobante.findUnique({
        where: { id: comprobanteId },
      });

      if (!comprobante) {
        res.status(404).json({ error: 'Comprobante no encontrado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No se envió ningún archivo' });
        return;
      }

      const uploaded = await StorageService.uploadFile(req.file, 'comprobantes');

      const archivoAdjunto = await prisma.archivoAdjunto.create({
        data: {
          nombreOriginal: uploaded.nombreOriginal,
          nombreAlmacenado: uploaded.nombreAlmacenado,
          mimeType: uploaded.mimeType,
          storageProvider: uploaded.storageProvider,
          storagePath: uploaded.storagePath,
          urlPublica: uploaded.urlPublica || null,
          comprobanteId,
        },
      });

      res.status(201).json(archivoAdjunto);
    } catch (error) {
      next(error);
    }
  }
}
