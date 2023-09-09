import mongoose, { SessionOption } from 'mongoose';

import Project from '@models/project';
import type { TestExecutionArguments, ITest, IProject } from '@models/project';
import type { IUpload } from '@models/upload';

import Logger from '@logging/logger';

import uploadService from '@services/upload-service';

import testRunnerProjectApi from '@api/test-runner/project-api';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';

/**
 * If there is a previous upload for the specified project, updates that upload with the new zip buffer.
 * Otherwise, creates a new upload for the project.
 *
 * @param {string} projectName - The name associated with the upload.
 * @param {Buffer} zipBuffer - The zip buffer to upload.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<IUpload>} A promise that resolves to the uploaded data.
 * @throws {HTTPError | Error} Error if an error occurs during the upload.
 */
const uploadZipBuffer = async (
  projectName: string, zipBuffer: Buffer, sessionOption?: SessionOption
): Promise<IUpload> => Project.findOne({ projectName }, 'upload', sessionOption)
  .then((existingProject) => {
    const previousUpload = existingProject && existingProject.upload;
    return uploadService.uploadZipBuffer(projectName, zipBuffer, previousUpload, sessionOption);
  });

/**
 * Upserts (insert or update) a project.
 *
 * @param {Object} projectFields - An object containing the project fields to upsert.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the operation.
 * @returns {Promise<IProject>} A promise that resolves to the upserted project.
 * @throws {Error} If the upsert operation fails.
 */
const upsertProject = (
  fields: { projectName: string, upload: IUpload, testExecutionArguments: TestExecutionArguments, tests: ITest[] },
  sessionOption?: SessionOption
): Promise<IProject> => Project.findOneAndUpdate(
  { projectName: fields.projectName },
  fields,
  { upsert: true, new: true, ...sessionOption }
).populate('upload').then((projectSaved) => {
  if (!projectSaved) throw new Error(`Project creation or update with the name '${fields.projectName}' failed.`);
  return projectSaved;
});

/**
 * Creates a new project with the given name from a ZIP buffer or updates an existing project if found.
 *
 * @param {string} projectName - The name of the new project.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {TestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject, dockerImage: object }>} A promise that resolves to an object containing the created or updated project and the docker image created for it.
 * @throws {Error} If any error occurs during project creation or update.
 */
const saveProject = async (
  projectName: string, requestFile: RequestFile, execArgs: TestExecutionArguments
): Promise<{ project: IProject, dockerImage: object }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Creating or updating a project with the name '${projectName}'.`);

    // Call the test runner service to build the Docker image
    const testRunnerOutput = await testRunnerProjectApi.uploadProjectToTestRunnerService(projectName, requestFile);
    const tests = testRunnerOutput?.output?.tests?.map((test) => ({ test, weight: 1.0 })) || [];

    // Upload files and get the upload document saved
    const uploadSaved = await uploadZipBuffer(projectName, requestFile.buffer, { session });

    // Find or update project
    const project = await upsertProject(
      { projectName, upload: uploadSaved, testExecutionArguments: execArgs, tests },
      { session }
    );

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully created or updated a project with the name '${projectName}'.`);
      return { project, dockerImage: testRunnerOutput?.image };
    });
  } catch (err: Error | unknown) {
    // Handle any errors and abort the transaction
    await session.abortTransaction();
    throw errorUtils.getErrorWithoutDetails('An error occurred while creating or updating a project.', err as Error);
  } finally {
    session.endSession();
  }
};

export default { saveProject };
