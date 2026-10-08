import { Router } from 'express';
import { LotesController } from '../controllers/lotes.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', LotesController.getAll);
router.get('/:id', LotesController.getById);
router.post('/', validateBody(['nombre', 'hectareas']), LotesController.create);
router.put('/:id', LotesController.update);
router.delete('/:id', LotesController.delete);

export default router;
