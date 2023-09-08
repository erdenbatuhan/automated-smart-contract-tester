import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import HTTPError from '@errors/http-error';

import executionService from '@services/execution-service';

import routerUtils from '@utils/router-utils';
import type { IMulterRequest, IModifiedRequest } from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads the smart contracts that the tests will be run against.
 *
 * The uploaded ZIP file must contain the smart contracts in a 'src' folder.
 *
 * @param {string} projectName - The name of the project associated with the tests.
 * @consumes multipart/form-data
 * @param {file} srcZip.file.required - The ZIP file containing the smart contracts to be tested.
 * @returns {object} 200 - The execution result, including test output and details.
 * @returns {object} 400 - Bad request error, such as missing parameters or invalid file format.
 * @returns {object} 500 - Internal server error, indicating a failure during execution.
 */
router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = (req as IModifiedRequest).locals;
    const zipBuffer = routerUtils.extractFileBuffer(req as IMulterRequest);

    await executionService.executeTests(projectName, zipBuffer).then((execution) => {
      res.status(200).json(execution);
    });
  } catch (err: HTTPError | Error | unknown) {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message || 'An error occurred.' });
  }
});

export default router;
