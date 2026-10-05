import { Router } from 'express';
import { efiRouter } from './efi.routes.ts';
import { healthRouter } from './health.routes.ts';

export const apiRouter = Router();

apiRouter.use('/efi', efiRouter);
apiRouter.use('/', healthRouter);
