import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import type AppError from '@errors/AppError';

import dockerImageServices from '@services/dockerImageServices';

import routerUtils from '@utils/routerUtils';

const router = Router();

/**
 * Retrieves a list of all Docker Images.
 *
 * @returns {object} 200 - An array of Docker Images.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', async (req: Request, res: Response) => {
  dockerImageServices.findAllDockerImages().then((dockerImages) => {
    res.status(HttpStatusCode.Ok).json(dockerImages);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Retrieves a Docker Image.
 *
 * @param {string} req.params.imageName - The name of the Docker Image.
 * @returns {object} 200 - The Docker Image with the specified name.
 * @throws {object} 404 - If the Docker Image with the given name is not found.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:imageName', async (req: Request, res: Response) => {
  const { imageName } = req.params;

  dockerImageServices.findDockerImage(imageName).then((dockerImage) => {
    res.status(HttpStatusCode.Ok).json(dockerImage);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Removes a Docker Image.
 *
 * @param {string} req.params.imageName - The name of the Docker Image.
 * @returns {object} 204 - No content if the Docker Image is successfully removed.
 * @throws {object} 404 - If the Docker Image with the given name is not found.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:imageName', async (req: Request, res: Response) => {
  const { imageName } = req.params;

  dockerImageServices.deleteDockerImage(imageName).then(() => {
    res.status(HttpStatusCode.NoContent).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

export default router;
