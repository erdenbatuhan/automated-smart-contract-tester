import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import Project from '@models/project';
import type { IProject } from '@models/project';
import type { ITestExecutionArguments } from '@models/schemas/test-execution-arguments';
import type { ITest } from '@models/schemas/test';

import uploadService from '@services/upload-service';
import testRunnerProjectApi from '@api/testrunner/project-api';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';

/**
 * Finds all projects.
 *
 * @returns {Promise<IProject[]>} A promise that resolves to an array of all projects.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllProjects = async (): Promise<IProject[]> => Project.find()
  .exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(
      new AppError(500, 'An error occurred while finding all projects.', (err as Error)?.message));
  });

/**
 * Finds a project by its name.
 *
 * @param {string} projectName - The name of the project to find.
 * @param {ProjectionType<IProject>} [projection] - Optional projection for the query.
 * @param {SessionOption} [sessionOption] - Optional session option for the query.
 * @returns {Promise<IProject>} A promise that resolves to the found project.
 * @throws {AppError} If the project is not found (HTTP 404) or if an error occurs during the operation.
 */
const findProjectByName = (
  projectName: string, projection?: ProjectionType<IProject>, sessionOption?: SessionOption
): Promise<IProject> => Project.findOne({ projectName }, projection, sessionOption)
  .populate('upload').exec()
  .then((project) => {
    if (!project) throw new AppError(404, `No project found with the name '${projectName}'.`);
    return project;
  })
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while finding the project with the name '${projectName}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });

/**
 * Creates a new project or updates an existing one.
 *
 * This function sends the project files to the test runner service to build a Docker image for the project.
 * Afterward, it creates an Upload document associated with the project files and saves the project with these changes.
 *
 * @param {IProject} project - The project to create or update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object containing the created or
 *                                                                updated project and Docker image information.
 * @throws {AppError} If any error occurs during project creation or update.
 */
const saveProject = async (
  project: IProject, requestFile: RequestFile
): Promise<{ project: IProject; dockerImage: object }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`${project.isNew ? 'Creating' : 'Updating'} a project with the name '${project.projectName}'.`);

    // Step 1: Upload files and get the upload document saved
    project.upload = await uploadService.uploadZipBuffer(
      project.projectName, requestFile.buffer, project.upload, { session });

    // Step 2: Call the test runner service to build the Docker image
    const testRunnerOutput = await testRunnerProjectApi.uploadProject(
      project.projectName, requestFile);
    project.tests = testRunnerOutput?.output?.tests?.map((test) => ({ test, weight: 1.0 })) || [];

    // Step 3: Create or update project
    const projectSaved = await project.save({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ${project.isNew ? 'created' : 'updated'} a project with the name '${project.projectName}'.`);
      return { project: projectSaved, dockerImage: testRunnerOutput?.image };
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while ${project.isNew ? 'creating' : 'updating'} a project.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  } finally {
    await session.endSession();
  }
};

/**
 * Builds and creates a new project with the given name from a ZIP buffer.
 * If a project with the same name already exists, it fails.
 *
 * @param {string} projectName - The name of the new project.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {ITestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the created project and Docker image information.
 * @throws {AppError} If a project with the same name already exists (409) or if any error occurs during project creation.
 */
const buildAndCreateProject = async (
  projectName: string, requestFile: RequestFile, execArgs: ITestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Check if a project with the same name already exists
  const projectExists = await Project.exists({ projectName });
  if (projectExists) throw new AppError(409, `A project with the name '${projectName}' already exists.`);

  const newProject = new Project({ projectName, testExecutionArguments: execArgs }); // Create new project
  return await saveProject(newProject, requestFile);
};

/**
 * Rebuilds and updates an existing project with the new ZIP buffer.
 * If the project does not exist, it fails.
 *
 * @param {string} projectName - The name of the existing project to update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {ITestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the updated project and Docker image information.
 * @throws {AppError} If the project does not exist (404) or if any error occurs during project update.
 */
const rebuildAndUpdateProject = async (
  projectName: string, requestFile: RequestFile, execArgs: ITestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Find the existing project
  const existingProject = await findProjectByName(projectName);
  existingProject.testExecutionArguments = execArgs; // Update the existing project's test execution arguments

  return await saveProject(existingProject, requestFile);
};

/**
 * Update test weights and execution arguments for an existing project.
 *
 * @param {string} projectName - The name of the project to update.
 * @param {ITest[]} [testsWithNewWeights] - An optional array of test objects with updated weights.
 * @param {ITestExecutionArguments} [updatedExecArgs] - Optional updated execution arguments for the project's tests.
 * @returns {Promise<IProject>} A promise that resolves to the updated project.
 * @throws {AppError} If the project doesn't exist or if there's a server error during the update.
 */
const updateProjectTestWeightsAndExecutionArguments = async (
  projectName: string,
  testsWithNewWeights?: ITest[],
  updatedExecArgs?: ITestExecutionArguments
): Promise<IProject> => {
  // Find the existing project
  Logger.info(`Updating test weights and execution arguments of the ${projectName} project.`);
  const existingProject = await findProjectByName(projectName);

  // Update test weights if provided
  if (testsWithNewWeights) {
    existingProject.tests = existingProject.tests.map((existingTest: ITest) => {
      const newWeight = testsWithNewWeights!.find(({ test }) => test === existingTest.test)?.weight;
      existingTest.weight = newWeight || existingTest.weight;

      return existingTest;
    });
  }

  // Update execution arguments if provided
  if (updatedExecArgs) existingProject.testExecutionArguments = updatedExecArgs;

  return existingProject.save().then((project) => {
    Logger.info(`Successfully updated test weights and execution arguments of the ${projectName} project.`);
    return project;
  }).catch((err: Error | unknown) => {
    const message = `An error occurred while updating test weights and execution arguments of the ${projectName} project.`;
    throw errorUtils.logAndGetError(new AppError(500, message, (err as Error)?.message));
  });
};

/**
 * Downloads the uploaded files associated with the project.
 *
 * @param {string} projectName - The name of the project.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer containing project files.
 * @throws {AppError} If the project does not exist (HTTP 404) or if there's an error during the download (HTTP 500).
 */
const downloadProjectFiles = (projectName: string): Promise<Buffer> => findProjectByName(projectName, 'upload')
  .then(({ upload }) => uploadService.downloadUploadedFiles(`${projectName} project`, upload));

/**
 * Deletes a project, including its associated upload, and also its Docker image managed by the Test Runner service.
 *
 * @param {string} projectName - The name of the project to delete.
 * @returns {Promise<void>} A promise that resolves once the project and its associated resources are successfully deleted.
 * @throws {AppError} If there's an error during the deletion process (HTTP 500).
 */
const deleteProject = async (projectName: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Deleting the ${projectName} project.`);

    // Step 1: Delete the upload associated with the project
    await findProjectByName(projectName, 'upload', { session })
      .then(({ upload }) => uploadService.deleteUpload(upload, { session }));

    // Step 2: Delete the project from the DB
    await Project.deleteOne({ projectName }, { session }).exec().then(({ deletedCount }) => {
      if (!deletedCount) throw new Error(`Failed to delete the document for ${projectName}.`);
    });

    // Step 3: Send a deletion request to the Test Runner service to delete the project's image
    await testRunnerProjectApi.sendProjectDeletionRequest(projectName);

    // Commit transaction
    await session.commitTransaction();
    Logger.info(`Successfully deleted the ${projectName} project.`);
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors and throw an AppError with relevant status code and error message
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while deleting the ${projectName} project.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  } finally {
    // End the session
    await session.endSession();
  }
};

export default {
  findAllProjects,
  findProjectByName,
  buildAndCreateProject,
  rebuildAndUpdateProject,
  updateProjectTestWeightsAndExecutionArguments,
  downloadProjectFiles,
  deleteProject
};
