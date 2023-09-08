import { Router } from 'express';
import type { Request, Response } from 'express';

import HTTPError from '@errors/http-error';

import dockerImageService from '@services/docker-image-service';

import routerUtils from '@utils/router-utils';

const router = Router();

/**
 * Retrieves a list of all Docker Images.
 *
 * @returns {object} 200 - An array of Docker Images.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', async (req: Request, res: Response) => {
  dockerImageService.findAllDockerImages().then((dockerImages) => {
    res.status(200).json(dockerImages);
  }).catch((err: HTTPError | Error | unknown) => {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message || 'An error occurred.' });
  });
});

/**
 * Retrieves a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @returns {object} 200 - The Docker Image with the specified name.
 * @throws {object} 404 - If the Docker Image with the given name is not found.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:imageName', async (req: Request, res: Response) => {
  try {
    const { imageName } = routerUtils.extractRequiredParams(req, ['imageName']);

    await dockerImageService.findDockerImage(imageName).then((dockerImage) => {
      res.status(200).json(dockerImage);
    });
  } catch (err: HTTPError | Error | unknown) {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message || 'An error occurred.' });
  }
});

/**
 * Removes a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @returns {object} 204 - No content if the Docker Image is successfully removed.
 * @throws {object} 404 - If the Docker Image with the given name is not found.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:imageName', async (req: Request, res: Response) => {
  try {
    const { imageName } = routerUtils.extractRequiredParams(req, ['imageName']);

    await dockerImageService.removeDockerImage(imageName).then(() => {
      res.status(204).end();
    });
  } catch (err: HTTPError | Error | unknown) {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message || 'An error occurred.' });
  }
});

export default router;
