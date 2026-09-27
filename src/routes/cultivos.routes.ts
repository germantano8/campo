import { Router } from 'express';
import { CultivosController } from '../controllers/cultivos.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', CultivosController.getAll);
router.get('/:id', CultivosController.getById);
router.post('/', validateBody(['nombre']), CultivosController.create);
router.put('/:id', validateBody(['nombre']), CultivosController.update);
router.delete('/:id', CultivosController.delete);

export default router;
