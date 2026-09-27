import { Router } from 'express';
import { TercerosController } from '../controllers/terceros.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', TercerosController.getAll);
router.get('/:id', TercerosController.getById);
router.post('/', validateBody(['nombre']), TercerosController.create);
router.put('/:id', validateBody(['nombre']), TercerosController.update);
router.delete('/:id', TercerosController.delete);

export default router;
