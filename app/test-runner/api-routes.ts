import { Router } from 'express';

import projectMiddleware from '@middlewares/project-middleware';

import healthCheckRoutes from '@routes/health-check-routes';
import forgeRoutes from '@routes/forge-routes';
import projectRoutes from '@routes/project-routes';
import dockerImageRoutes from '@routes/docker-image-routes';
import executionRoutes from '@routes/execution-routes';

const router = Router();

router.use('/', healthCheckRoutes);
router.use('/forge', forgeRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/images', dockerImageRoutes);
router.use('/projects/:projectName/executions', projectMiddleware.passProjectName, executionRoutes);

export default router;
