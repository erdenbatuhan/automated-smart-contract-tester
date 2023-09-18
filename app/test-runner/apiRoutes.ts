import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '~Constants';
import projectMiddlewares from '@middlewares/projectMiddlewares';

import forgeRoutes from '@routes/forgeRoutes';
import projectRoutes from '@routes/projectRoutes';
import dockerImageRoutes from '@routes/dockerImageRoutes';
import executionRoutes from '@routes/executionRoutes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/forge', forgeRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/images', dockerImageRoutes);
router.use('/projects/:projectName/executions', projectMiddlewares.passProjectName, executionRoutes);

export default router;
