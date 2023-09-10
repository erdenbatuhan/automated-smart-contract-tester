import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import HTTPError from '@errors/http-error';

import executionService from '@services/execution-service';

import routerUtils from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads the smart contracts that the tests will be run against.
 *
 * The uploaded ZIP file must contain the smart contracts in a 'src' folder.
 *
 * @param {string} projectName - The name of the project associated with the tests.
 * @consumes multipart/form-data
 * @param {file} srcZip - The ZIP file containing the smart contracts to be tested.
 * @param {object=} [execArgs] - "Optional" execution arguments for the tests.
 * @returns {object} 200 - The execution result, including test output and details.
 * @returns {object} 400 - Bad request error, such as missing parameters or invalid file format.
 * @returns {object} 500 - Internal server error, indicating a failure during execution.
 */
router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = res.locals;
    const zipBuffer = routerUtils.extractFileBuffer(req);
    const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs');

    await executionService.executeTests(projectName, zipBuffer, execArgs).then((execution) => {
      res.status(201).json(execution);
    });
  } catch (err: HTTPError | Error | unknown) {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message });
  }
});

export default router;
