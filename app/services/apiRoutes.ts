import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '~constants';

import authMiddlewares from '@middlewares/auth-middlewares';
import projectMiddlewares from '@middlewares/project-middlewares';

import authRoutes from '@routes/auth-routes';
import userRoutes from '@routes/user-routes';
import projectRoutes from '@routes/project-routes';
import submissionRoutes from '@routes/submission-routes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/auth', authRoutes);
router.use('/users', authMiddlewares.requireAuth, userRoutes);
router.use('/projects', authMiddlewares.requireAuth, projectRoutes);
router.use('/projects/:projectName/submissions', authMiddlewares.requireAuth, projectMiddlewares.passProjectName, submissionRoutes);

export default router;
