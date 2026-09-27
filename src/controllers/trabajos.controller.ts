import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { StorageService } from '../lib/storage';

export class TrabajosController {
  /**
   * Lista todos los trabajos realizados con filtros opcionales por lote, tipo y fechas
   */
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loteId, tipo, fechaDesde, fechaHasta } = req.query;

      const where: any = {};
      if (loteId) where.loteId = BigInt(String(loteId));
      if (tipo) where.tipo = String(tipo);
      if (fechaDesde || fechaHasta) {
        where.fecha = {};
        if (fechaDesde) where.fecha.gte = new Date(String(fechaDesde));
        if (fechaHasta) where.fecha.lte = new Date(String(fechaHasta));
      }

      const trabajos = await prisma.trabajo.findMany({
        where,
        include: {
          lote: {
            select: {
              id: true,
              nombre: true,
              regimen: true,
              propietario: { select: { id: true, nombre: true } },
            },
          },
          siembra: { include: { cultivo: true } },
          fumigacion: { include: { cultivo: true } },
          cosecha: { include: { cultivo: true } },
          _count: {
            select: { comprobantes: true, archivosAdjuntos: true },
          },
        },
        orderBy: { fecha: 'desc' },
      });

      res.json(trabajos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un trabajo por ID con su detalle específico (siembra/fumigación/cosecha) y adjuntos
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const trabajo = await prisma.trabajo.findUnique({
        where: { id },
        include: {
          lote: {
            include: { propietario: true },
          },
          siembra: { include: { cultivo: true } },
          fumigacion: { include: { cultivo: true } },
          cosecha: {
            include: {
              cultivo: true,
              movimientosCereal: true,
            },
          },
          comprobantes: true,
          archivosAdjuntos: true,
        },
      });

      if (!trabajo) {
        res.status(404).json({ error: 'Trabajo no encontrado' });
        return;
      }

      res.json(trabajo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea un nuevo trabajo agronómico (Siembra, Fumigación o Cosecha).
   * Si es COSECHA en un lote ALQUILADO, ingresa automáticamente el cereal pactado al acopio del dueño.
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        loteId,
        tipo, // 'SIEMBRA' | 'FUMIGACION' | 'COSECHA'
        fecha,
        hectareas,
        observaciones,
        siembra, // { cultivoId, variedadSemilla }
        fumigacion, // { cultivoId? }
        cosecha, // { cultivoId, rendimiento }
      } = req.body;

      // Obtener el lote para verificar su régimen de tenencia
      const lote = await prisma.lote.findUnique({
        where: { id: BigInt(loteId) },
        include: { propietario: true },
      });

      if (!lote) {
        res.status(404).json({ error: 'El lote especificado no existe' });
        return;
      }

      // Ejecutar creación del trabajo y detalle en una transacción
      const resultado = await prisma.$transaction(async (tx) => {
        const nuevoTrabajo = await tx.trabajo.create({
          data: {
            loteId: BigInt(loteId),
            tipo,
            fecha: new Date(fecha),
            hectareas,
            observaciones: observaciones || null,
          },
        });

        // Crear subtipo correspondiente
        if (tipo === 'SIEMBRA' && siembra) {
          await tx.siembra.create({
            data: {
              trabajoId: nuevoTrabajo.id,
              cultivoId: BigInt(siembra.cultivoId),
              variedadSemilla: siembra.variedadSemilla,
            },
          });
        } else if (tipo === 'FUMIGACION') {
          await tx.fumigacion.create({
            data: {
              trabajoId: nuevoTrabajo.id,
              cultivoId: fumigacion?.cultivoId ? BigInt(fumigacion.cultivoId) : null,
            },
          });
        } else if (tipo === 'COSECHA' && cosecha) {
          const nuevaCosecha = await tx.cosecha.create({
            data: {
              trabajoId: nuevoTrabajo.id,
              cultivoId: BigInt(cosecha.cultivoId),
              rendimiento: cosecha.rendimiento,
            },
          });

          // Si el lote es alquilado y tiene propietario, ingresar cereal a acopio según las condiciones pactadas
          if (lote.regimen === 'ALQUILADO' && lote.propietarioId) {
            const totalKgCosechados = Number(hectareas) * Number(cosecha.rendimiento);
            let kgParaPropietario = 0;

            if (lote.modalidadAlquiler === 'PORCENTAJE' && lote.valorAlquiler) {
              kgParaPropietario = totalKgCosechados * (Number(lote.valorAlquiler) / 100);
            } else if (lote.modalidadAlquiler === 'QUINTALES_FIJOS' && lote.valorAlquiler) {
              // 1 quintal = 100 kg
              kgParaPropietario = Number(hectareas) * Number(lote.valorAlquiler) * 100;
            } else {
              // Si no hay fórmula específica, ingresa el total
              kgParaPropietario = totalKgCosechados;
            }

            if (kgParaPropietario > 0) {
              await tx.movimientoCereal.create({
                data: {
                  terceroId: lote.propietarioId,
                  cultivoId: BigInt(cosecha.cultivoId),
                  tipo: 'INGRESO_COSECHA',
                  cantidadKg: kgParaPropietario,
                  cosechaId: nuevaCosecha.id,
                  fecha: new Date(fecha),
                  observaciones: `Ingreso automático por cosecha en lote '${lote.nombre}' (${lote.modalidadAlquiler || 'Alquiler'})`,
                },
              });
            }
          }
        }

        return nuevoTrabajo;
      });

      // Devolver trabajo completo
      const trabajoCompleto = await prisma.trabajo.findUnique({
        where: { id: resultado.id },
        include: {
          lote: true,
          siembra: { include: { cultivo: true } },
          fumigacion: { include: { cultivo: true } },
          cosecha: { include: { cultivo: true, movimientosCereal: true } },
        },
      });

      res.status(201).json(trabajoCompleto);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza datos generales de un trabajo
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const { fecha, hectareas, observaciones } = req.body;

      const trabajoActualizado = await prisma.trabajo.update({
        where: { id },
        data: {
          fecha: fecha ? new Date(fecha) : undefined,
          hectareas: hectareas !== undefined ? hectareas : undefined,
          observaciones: observaciones !== undefined ? observaciones : undefined,
        },
        include: {
          lote: true,
          siembra: true,
          fumigacion: true,
          cosecha: true,
        },
      });

      res.json(trabajoActualizado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un trabajo y sus subtipos asociados en cascada
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));

      await prisma.trabajo.delete({
        where: { id },
      });

      res.json({ message: 'Trabajo eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sube fotos de campo, remitos de labor o certificados asociados a un trabajo
   */
  public static async uploadAdjunto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const trabajoId = BigInt(String(req.params.id));

      const trabajo = await prisma.trabajo.findUnique({
        where: { id: trabajoId },
      });

      if (!trabajo) {
        res.status(404).json({ error: 'Trabajo no encontrado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No se envió ningún archivo' });
        return;
      }

      const uploaded = await StorageService.uploadFile(req.file, 'trabajos');

      const archivoAdjunto = await prisma.archivoAdjunto.create({
        data: {
          nombreOriginal: uploaded.nombreOriginal,
          nombreAlmacenado: uploaded.nombreAlmacenado,
          mimeType: uploaded.mimeType,
          storageProvider: uploaded.storageProvider,
          storagePath: uploaded.storagePath,
          urlPublica: uploaded.urlPublica || null,
          trabajoId,
        },
      });

      res.status(201).json(archivoAdjunto);
    } catch (error) {
      next(error);
    }
  }
}
