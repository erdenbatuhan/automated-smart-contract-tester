import { Router } from 'express';
import timeout from 'connect-timeout';

import Constants from '~Constants';

import authMiddlewares from '@middlewares/authMiddlewares';
import projectMiddlewares from '@middlewares/projectMiddlewares';

import authRoutes from '@routes/authRoutes';
import userRoutes from '@routes/userRoutes';
import projectRoutes from '@routes/projectRoutes';
import submissionRoutes from '@routes/submissionRoutes';

const router = Router();
router.use(timeout(Constants.REQUEST_TIMEOUT * 1000)); // Set request timeout

// Application Routes
router.use('/auth', authRoutes);
router.use('/users', authMiddlewares.requireAuth, userRoutes);
router.use('/projects', authMiddlewares.requireAuth, projectRoutes);
router.use('/projects/:projectName/submissions', authMiddlewares.requireAuth, projectMiddlewares.passProjectName, submissionRoutes);

export default router;
