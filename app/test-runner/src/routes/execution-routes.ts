import express, { Request, Response } from 'express';
import multer from 'multer';

import executionController from '../controllers/execution-controller';

import routerUtils from '../utils/router-utils';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads the smart contracts that the tests will be run against.
 *
 * The uploaded ZIP file must contain the smart contracts in a 'src' folder.
 *
 * @param {string} projectName.query.required - The name of the project associated with the tests.
 * @param {file} srcZip.formData.required - The ZIP file containing the smart contracts to be tested.
 * @returns {object} 200 - The execution result, including test output and details.
 * @returns {object} 400 - Bad request error, such as missing parameters or invalid file format.
 * @returns {object} 500 - Internal server error, indicating a failure during execution.
 */
router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = (req as any).locals;
    const zipBuffer = routerUtils.extractFileBuffer(req);

    await executionController.executeTests(projectName, zipBuffer).then((execution) => {
      res.status(200).json(execution);
    });
  } catch (err: Error | any) {
    res.status(err.statusCode || 500).json({ error: err ? err.message : 'An error occurred.' });
  }
});

export default router;
