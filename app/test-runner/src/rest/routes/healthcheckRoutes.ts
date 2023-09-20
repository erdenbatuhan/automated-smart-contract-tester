import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import dockerUtils from '@utils/dockerUtils';
import routerUtils from '@utils/routerUtils';

const router = Router();

/**
 * Performs a health check on the service's Docker daemon accessibility and respond with a success message if the service is healthy.
 *
 * @param {Request} req - The Express Request object representing the incoming HTTP request.
 * @param {Response} res - The Express Response object for sending the HTTP response.
 * @returns {object} 200 - If the health check succeeded, returns the message and Docker information.
 * @throws {object} 503 - If the Docker daemon cannot be pinged and is not accessible.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/docker', async (req: Request, res: Response) => {
  dockerUtils.ensureDockerDaemonAccessibility().then(({ socketPath, info }) => {
    res.status(HttpStatusCode.Ok).send({
      message: `The health check succeeded, and the Docker daemon is running on socket '${socketPath}'. The service is in a healthy state.`,
      docker: info
    });
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

export default router;
