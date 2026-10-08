import { Router } from 'express';
import { TrabajosController } from '../controllers/trabajos.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', TrabajosController.getAll);
router.get('/:id', TrabajosController.getById);
router.post(
  '/',
  validateBody(['loteId', 'tipo', 'fecha', 'hectareas']),
  TrabajosController.create
);
router.put('/:id', TrabajosController.update);
router.delete('/:id', TrabajosController.delete);
router.post(
  '/:id/adjuntos',
  uploadMiddleware.single('archivo'),
  TrabajosController.uploadAdjunto
);

export default router;
