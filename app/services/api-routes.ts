import { Router } from 'express';

import projectMiddleware from '@middlewares/project-middleware';

import healthCheckRoutes from '@routes/health-check-routes';
import authRoutes from '@routes/auth-routes';
import userRoutes from '@routes/user-routes';
import projectRoutes from '@routes/project-routes';
import submissionRoutes from '@routes/submission-routes';

const router = Router();

router.use('/', healthCheckRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/:projectName/submissions', projectMiddleware.passProjectName, submissionRoutes);

export default router;
