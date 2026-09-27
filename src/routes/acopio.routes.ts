import { Router } from 'express';
import { AcopioController } from '../controllers/acopio.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { uploadSingleFile } from '../middlewares/upload.middleware';

const router = Router();

router.get('/resumen', AcopioController.getResumenGlobal);
router.get('/saldo/:terceroId', AcopioController.getSaldoByTercero);
router.get('/movimientos/:terceroId', AcopioController.getMovimientosByTercero);
router.post(
  '/movimiento',
  validateBody(['terceroId', 'cultivoId', 'tipo', 'cantidadKg', 'fecha']),
  AcopioController.createMovimiento
);
// POST /liquidar ahora permite enviar datos de la venta y adjuntar el PDF de la factura en una sola llamada
router.post(
  '/liquidar',
  uploadSingleFile,
  validateBody(['terceroId', 'cultivoId', 'kilosAVender', 'fecha']),
  AcopioController.liquidar
);
router.delete('/movimiento/:id', AcopioController.deleteMovimiento);

export default router;
