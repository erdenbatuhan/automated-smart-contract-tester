import type { Request, Response, NextFunction } from 'express';

import express from 'express';

import routerUtils, { IModifiedRequest } from './src/utils/router-utils';

import healthCheckRoutes from './src/routes/health-check-routes';
import forgeRoutes from './src/routes/forge-routes';
import projectRoutes from './src/routes/project-routes';
import executionRoutes from './src/routes/execution-routes';

const router = express.Router();

router.use('/', healthCheckRoutes);
router.use('/forge', forgeRoutes);
router.use('/project', projectRoutes);
router.use('/project/:projectName/execution', (req: Request, res: Response, next: NextFunction) => {
  (req as IModifiedRequest).locals = routerUtils.extractRequiredParams(req, ['projectName']);
  next();
}, executionRoutes);

export default router;