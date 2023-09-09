import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Endpoint to perform a health check on the service. It verifies that everything works as expected.
 *
 * @returns {string} 200 - A success message indicating that everything works as expected.
 * @returns {string} 500 - Internal server error message if there's an issue with the health check.
 */
router.post('/', async (req: Request, res: Response) => {
  // Replace the following promise with the service of your choice to easily verify that it works
  const healthCheckPromise = new Promise<string>((resolve) => {
    resolve('Yey! Everything works as expected!');
  });

  healthCheckPromise.then((result) => {
    res.status(200).send(result);
  }).catch((err: Error | unknown) => {
    res.status(500).send((err as Error)?.message);
  });
});

export default router;
