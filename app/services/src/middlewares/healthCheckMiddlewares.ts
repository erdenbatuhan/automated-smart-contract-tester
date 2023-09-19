import { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

/**
 * Perform a health check and respond with a success message if the service is healthy.
 *
 * @param {Request} req - The Express Request object representing the incoming HTTP request.
 * @param {Response} res - The Express Response object for sending the HTTP response.
 * @returns {Promise<void>} - A Promise that resolves when the response is sent.
 */
const performHealthCheck = (req: Request, res: Response): void => {
  res.status(HttpStatusCode.Ok).send('The health check indicates success, and the service is in a healthy state.');
};

export default { performHealthCheck };
