import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '@Constants';
import projectMiddlewares from '@middlewares/projectMiddlewares';

import healthcheckRoutes from '@rest/routes/healthcheckRoutes';
import forgeRoutes from '@rest/routes/forgeRoutes';
import projectRoutes from '@rest/routes/projectRoutes';
import dockerImageRoutes from '@rest/routes/dockerImageRoutes';
import executionRoutes from '@rest/routes/executionRoutes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/', healthcheckRoutes);
router.use('/forge', forgeRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/images', dockerImageRoutes);
router.use('/projects/:projectName/executions', projectMiddlewares.passProjectName, executionRoutes);

export default router;
