import { Router } from 'express';

import authMiddlewares from '@middlewares/auth-middlewares';
import projectMiddlewares from '@middlewares/project-middlewares';

import healthCheckRoutes from '@routes/health-check-routes';
import authRoutes from '@routes/auth-routes';
import userRoutes from '@routes/user-routes';
import projectRoutes from '@routes/project-routes';
import submissionRoutes from '@routes/submission-routes';

const router = Router();

router.use('/', healthCheckRoutes);
router.use('/auth', authRoutes);
router.use('/users', authMiddlewares.requireAuth, userRoutes);
router.use('/projects', authMiddlewares.requireAuth, projectRoutes);
router.use('/projects/:projectName/submissions', authMiddlewares.requireAuth, projectMiddlewares.passProjectName, submissionRoutes);

export default router;
