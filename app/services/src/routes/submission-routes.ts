import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import type AppError from '@errors/app-error';

import uploadService from '@services/upload-service';

import routerUtils from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// /**
//  * Uploads the submission of smart contracts that will be tested.
//  *
//  * The folder must contain the smart contracts (src folder).
//  *
//  * @param {string} projectName - The name of the project associated with the tests.
//  * @param {file} srcZip - The ZIP file containing the smart contracts to be tested.
//  * @returns {object} 200 - The execution result, including test output and details.
//  * @returns {object} 400 - Bad request error, such as missing parameters or invalid file format.
//  * @returns {object} 500 - Internal server error, indicating a failure during execution.
//  */
// router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
//   try {
//     const { projectName } = res.locals;
//     const zipBuffer = routerUtils.getRequestFile(req).buffer;
//
//     await uploadService.uploadZipBuffer(projectName, zipBuffer).then((uploadSaved) => {
//       res.status(200).json(uploadSaved);
//     });
//   } catch (err: AppError | Error | unknown) {
//     routerUtils.handleError(res, err);
//   }
// });
//
// /**
//  * Downloads the submission uploaded.
//  *
//  * Note: The projectName must also be provided as a request parameter. (Refer to api-routes.ts)
//  *
//  * @param {string} submissionId - The ID of the submission to download.
//  */
// router.get('/:submissionId/download', async (req: Request, res: Response) => {
//   const { projectName } = res.locals;
//   const { submissionId } = req.params;
//
//   uploadService.getUploadedFilesInZipBuffer(projectName, submissionId)
//     .then((zipBuffer) => {
//       // TODO: Do this header setting in routerUtils or somewhere else
//       res.setHeader('Content-Disposition', `attachment; filename=project_${projectName}_submission_${submissionId}.zip`);
//       res.setHeader('Content-Type', 'application/zip');
//       res.status(200).send(zipBuffer);
//     }).catch((err: AppError | Error | unknown) => {
//       routerUtils.handleError(res, err);
//     });
// });

// TODO (1): Get Submissions
// TODO (2): Get Submission
// TODO (3): Do submission
// TODO (4): Download Submission Files
// TODO (5): Do submission - Calculate score

export default router;
