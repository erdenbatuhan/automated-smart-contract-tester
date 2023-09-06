import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import healthCheckRoutes from '@routes/health-check-routes';
import projectRoutes from '@routes/project-routes';
import submissionRoutes from '@routes/submission-routes';

import routerUtils, { IModifiedRequest } from '@utils/router-utils';

const router = express.Router();

router.use('/', healthCheckRoutes);
router.use('/project', projectRoutes);
router.use('/project/:projectName/submission', (req: Request, res: Response, next: NextFunction) => {
  (req as IModifiedRequest).locals = routerUtils.extractRequiredParams(req, ['projectName']);
  next();
}, submissionRoutes);

export default router;
