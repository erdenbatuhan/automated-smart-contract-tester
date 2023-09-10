import { Router } from 'express';
import type { Request, Response } from 'express';

import type AppError from '@errors/app-error';

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
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
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
  const { imageName } = req.params;

  dockerImageService.findDockerImage(imageName).then((dockerImage) => {
    res.status(200).json(dockerImage);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
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
  const { imageName } = req.params;

  dockerImageService.deleteDockerImage(imageName).then(() => {
    res.status(204).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

export default router;
