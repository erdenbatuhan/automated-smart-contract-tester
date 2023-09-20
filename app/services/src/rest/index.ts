import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '@Constants';

import authMiddlewares from '@middlewares/authMiddlewares';
import projectMiddlewares from '@middlewares/projectMiddlewares';

import healthcheckRoutes from '@rest/routes/healthcheckRoutes';
import authRoutes from '@rest/routes/authRoutes';
import userRoutes from '@rest/routes/userRoutes';
import projectRoutes from '@rest/routes/projectRoutes';
import submissionRoutes from '@rest/routes/submissionRoutes';
import messageRequestRoutes from '@rest/routes/messageRequestRoutes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/', healthcheckRoutes);
router.use('/auth', authRoutes);
router.use('/users', authMiddlewares.requireAuth, userRoutes);
router.use('/projects', authMiddlewares.requireAuth, projectRoutes);
router.use('/projects/:projectName/submissions', authMiddlewares.requireAuth, projectMiddlewares.passProjectName, submissionRoutes);
router.use('/message-requests', authMiddlewares.requireAuth, messageRequestRoutes);

export default router;
