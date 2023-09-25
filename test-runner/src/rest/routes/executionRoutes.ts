import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { HttpStatusCode } from 'axios';

import type AppError from '@errors/AppError';

import executionServices from '@services/executionServices';

import routerUtils from '@utils/routerUtils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads the smart contracts that the tests will be run against.
 *
 * The uploaded ZIP file must contain the smart contracts in a 'src' folder.
 *
 * @param {string} res.locals.projectName - The name of the project associated with the tests (see projectMiddlewares).
 * @consumes multipart/form-data
 * @param {file} req.file.srcZip - The ZIP file containing the smart contracts to be tested.
 * @param {object} [req.query.containerTimeout] - "Optional" timeout for container execution in seconds.
 * @param {object} [req.body.execArgs] - "Optional" execution arguments for the tests.
 * @returns {object} 200 - The execution result, including test output and details.
 * @returns {object} 400 - Bad request error, such as missing parameters or invalid file format.
 * @returns {object} 500 - Internal server error, indicating a failure during execution.
 */
router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = res.locals;
    const zipBuffer = routerUtils.extractFileBuffer(req);
    const containerTimeout = req.query?.containerTimeout ? Number(req.query.containerTimeout) : undefined;
    const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs');

    await executionServices.executeTests(projectName, zipBuffer, { containerTimeout, execArgs }).then((execution) => {
      res.status(HttpStatusCode.Created).json(execution);
    });
  } catch (err: AppError | Error | unknown) {
    routerUtils.sendErrorResponse(res, err);
  }
});

export default router;
