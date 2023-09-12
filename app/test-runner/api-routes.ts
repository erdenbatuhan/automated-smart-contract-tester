import { Router } from 'express';

import projectMiddlewares from '@middlewares/project-middlewares';

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
router.use('/projects/:projectName/executions', projectMiddlewares.passProjectName, executionRoutes);

export default router;
