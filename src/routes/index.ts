import { Router } from 'express';
import cultivosRouter from './cultivos.routes';
import lotesRouter from './lotes.routes';
import trabajosRouter from './trabajos.routes';
import tercerosRouter from './terceros.routes';
import comprobantesRouter from './comprobantes.routes';
import acopioRouter from './acopio.routes';

const apiRouter = Router();

apiRouter.use('/cultivos', cultivosRouter);
apiRouter.use('/lotes', lotesRouter);
apiRouter.use('/trabajos', trabajosRouter);
apiRouter.use('/terceros', tercerosRouter);
apiRouter.use('/comprobantes', comprobantesRouter);
apiRouter.use('/acopio', acopioRouter);

export default apiRouter;
