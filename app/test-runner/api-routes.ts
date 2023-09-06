import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import healthCheckRoutes from '@routes/health-check-routes';
import forgeRoutes from '@routes/forge-routes';
import projectRoutes from '@routes/project-routes';
import executionRoutes from '@routes/execution-routes';

import routerUtils, { IModifiedRequest } from '@utils/router-utils';

const router = express.Router();

router.use('/', healthCheckRoutes);
router.use('/forge', forgeRoutes);
router.use('/project', projectRoutes);
router.use('/project/:projectName/execution', (req: Request, res: Response, next: NextFunction) => {
  (req as IModifiedRequest).locals = routerUtils.extractRequiredParams(req, ['projectName']);
  next();
}, executionRoutes);

export default router;
