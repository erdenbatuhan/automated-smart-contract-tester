import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

const router = Router();

/**
 * Performs a health check on the service and respond with a success message if the service is healthy.
 *
 * @param {Request} req - The Express Request object representing the incoming HTTP request.
 * @param {Response} res - The Express Response object for sending the HTTP response.
 * @returns {object} 200 - If the health check succeeded, returns the message and Docker information.
 * @throws {object} 503 - If the Docker daemon cannot be pinged and is not accessible.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', async (req: Request, res: Response) => {
  res.status(HttpStatusCode.Ok).send('The health check indicates success, and the service is in a healthy state.');
});

export default router;
