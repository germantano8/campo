import { Router } from 'express';
import { ComprobantesController } from '../controllers/comprobantes.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { uploadMiddleware, uploadSingleFile } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', ComprobantesController.getAll);
router.get('/:id', ComprobantesController.getById);
router.post(
  '/',
  uploadSingleFile,
  validateBody(['terceroId', 'direccion', 'tipoComprobante', 'fechaEmision', 'total']),
  ComprobantesController.create
);
router.post(
  '/:id/adjuntos',
  uploadMiddleware.single('archivo'),
  ComprobantesController.uploadAdjunto
);

export default router;
