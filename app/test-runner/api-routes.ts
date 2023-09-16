import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '~constants';
import projectMiddlewares from '@middlewares/project-middlewares';

import forgeRoutes from '@routes/forge-routes';
import projectRoutes from '@routes/project-routes';
import dockerImageRoutes from '@routes/docker-image-routes';
import executionRoutes from '@routes/execution-routes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/forge', forgeRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/images', dockerImageRoutes);
router.use('/projects/:projectName/executions', projectMiddlewares.passProjectName, executionRoutes);

export default router;
