import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { StorageService } from '../lib/storage';

export class AcopioController {
  /**
   * Resumen global de stock de cereal acopiado en el sistema agrupado por cultivo
   */
  public static async getResumenGlobal(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cultivos = await prisma.cultivo.findMany({
        include: {
          movimientosCereal: true,
        },
        orderBy: { nombre: 'asc' },
      });

      const resumen = cultivos.map((c) => {
        const totalKg = c.movimientosCereal.reduce(
          (acc, m) => acc + Number(m.cantidadKg),
          0
        );
        return {
          cultivoId: c.id.toString(),
          cultivoNombre: c.nombre,
          totalKg,
        };
      });

      res.json(resumen);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene todos los saldos discriminados por productor y cultivo
   */
  public static async getSaldosGlobales(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const movimientos = await prisma.movimientoCereal.findMany({
        include: {
          tercero: { select: { id: true, nombre: true } },
          cultivo: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: 'asc' },
      });

      const map = new Map<string, {
        terceroId: string;
        terceroNombre: string;
        cultivoId: string;
        cultivoNombre: string;
        saldoKg: number;
      }>();

      for (const m of movimientos) {
        const key = `${m.terceroId}-${m.cultivoId}`;
        const item = map.get(key) || {
          terceroId: m.terceroId.toString(),
          terceroNombre: m.tercero.nombre,
          cultivoId: m.cultivoId.toString(),
          cultivoNombre: m.cultivo.nombre,
          saldoKg: 0,
        };
        item.saldoKg += Number(m.cantidadKg);
        map.set(key, item);
      }

      res.json(Array.from(map.values()));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene todos los movimientos con filtros opcionales
   */
  public static async getAllMovimientos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { terceroId, cultivoId } = req.query;
      const where: any = {};
      if (terceroId) where.terceroId = BigInt(String(terceroId));
      if (cultivoId) where.cultivoId = BigInt(String(cultivoId));

      const movimientos = await prisma.movimientoCereal.findMany({
        where,
        include: {
          tercero: true,
          cultivo: true,
          comprobante: true,
        },
        orderBy: { fecha: 'desc' },
      });

      res.json(movimientos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulta el saldo actual de cereal en kg discriminado por cultivo para un tercero
   */
  public static async getSaldoByTercero(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const terceroIdStr = String(req.params.terceroId);

      // Validación de parámetro numérico
      if (!terceroIdStr || isNaN(Number(terceroIdStr))) {
        res.status(400).json({ error: 'El ID del tercero debe ser un número válido' });
        return;
      }

      const terceroId = BigInt(terceroIdStr);

      const tercero = await prisma.tercero.findUnique({
        where: { id: terceroId },
        select: { id: true, nombre: true, cbu: true, tipo: true },
      });

      if (!tercero) {
        res.status(404).json({ error: 'Tercero no encontrado' });
        return;
      }

      // Obtener todos los movimientos del tercero con su cultivo
      const movimientos = await prisma.movimientoCereal.findMany({
        where: { terceroId },
        include: { cultivo: true },
        orderBy: { fecha: 'asc' },
      });

      // Agrupar y calcular saldos por cultivo
      const mapaSaldos = new Map<string, { cultivoId: string; cultivoNombre: string; saldoKg: number }>();

      for (const m of movimientos) {
        const idStr = m.cultivoId.toString();
        const actual = mapaSaldos.get(idStr) || {
          cultivoId: idStr,
          cultivoNombre: m.cultivo.nombre,
          saldoKg: 0,
        };
        actual.saldoKg += Number(m.cantidadKg);
        mapaSaldos.set(idStr, actual);
      }

      const saldos = Array.from(mapaSaldos.values());

      res.json({
        tercero,
        saldos,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el historial de movimientos de acopio de un tercero
   */
  public static async getMovimientosByTercero(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const terceroIdStr = String(req.params.terceroId);
      if (!terceroIdStr || isNaN(Number(terceroIdStr))) {
        res.status(400).json({ error: 'El ID del tercero debe ser un número válido' });
        return;
      }

      const terceroId = BigInt(terceroIdStr);
      const movimientos = await prisma.movimientoCereal.findMany({
        where: { terceroId },
        include: {
          cultivo: true,
          comprobante: true,
          cosecha: true,
        },
        orderBy: { fecha: 'desc' },
      });
      res.json(movimientos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra un movimiento directo en la cuenta corriente de acopio (ajuste, ingreso o egreso)
   */
  public static async createMovimiento(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        terceroId,
        cultivoId,
        tipo,
        cantidadKg,
        fecha,
        observaciones,
        cosechaId,
        comprobanteId,
      } = req.body;

      const nuevoMovimiento = await prisma.movimientoCereal.create({
        data: {
          terceroId: BigInt(terceroId),
          cultivoId: BigInt(cultivoId),
          tipo,
          cantidadKg,
          fecha: new Date(fecha),
          observaciones: observaciones || null,
          cosechaId: cosechaId ? BigInt(cosechaId) : null,
          comprobanteId: comprobanteId ? BigInt(comprobanteId) : null,
        },
        include: {
          cultivo: true,
          tercero: true,
        },
      });

      res.status(201).json(nuevoMovimiento);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Liquida cereal solicitado por el dueño del campo, reduciendo el stock y asociando la factura recibida
   */
  public static async liquidar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        terceroId,
        cultivoId,
        kilosAVender,
        precioPorKilo,
        fecha,
        crearComprobante,
        tipoComprobante,
        observaciones,
      } = req.body;

      const totalMonto = Number(kilosAVender) * (Number(precioPorKilo) || 0);

      const resultado = await prisma.$transaction(async (tx) => {
        let comprobanteCreado = null;

        if (crearComprobante === true || String(crearComprobante) === 'true') {
          comprobanteCreado = await tx.comprobante.create({
            data: {
              terceroId: BigInt(terceroId),
              direccion: 'RECIBIDA',
              tipoComprobante: tipoComprobante || 'LIQUIDACION',
              fechaEmision: new Date(fecha),
              subtotal: totalMonto,
              total: totalMonto,
              observaciones: observaciones || `Venta de ${kilosAVender} kg de cereal`,
            },
          });

          // Si vino un archivo adjunto (PDF / Imagen de la factura de liquidación)
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
                comprobanteId: comprobanteCreado.id,
              },
            });
          }
        }

        const movimientoEgreso = await tx.movimientoCereal.create({
          data: {
            terceroId: BigInt(terceroId),
            cultivoId: BigInt(cultivoId),
            tipo: 'VENTA_LIQUIDACION',
            cantidadKg: -Math.abs(Number(kilosAVender)),
            fecha: new Date(fecha),
            observaciones:
              observaciones ||
              `Liquidación de ${kilosAVender} kg a $${precioPorKilo ?? 0}/kg`,
            comprobanteId: comprobanteCreado ? comprobanteCreado.id : null,
          },
        });

        const comprobanteCompleto = comprobanteCreado
          ? await tx.comprobante.findUnique({
              where: { id: comprobanteCreado.id },
              include: { archivosAdjuntos: true },
            })
          : null;

        return {
          movimiento: movimientoEgreso,
          comprobante: comprobanteCompleto,
        };
      });

      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un movimiento de cereal específico
   */
  public static async deleteMovimiento(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));

      await prisma.movimientoCereal.delete({
        where: { id },
      });

      res.json({ message: 'Movimiento de cereal eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
