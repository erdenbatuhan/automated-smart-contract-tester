import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import type { IUser } from '@models/user';
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
const findAllProjects = async (): Promise<IProject[]> => Project.find().exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, 'An error occurred while finding all projects.');
  });

/**
 * Finds a project by its name.
 *
 * @param {string} projectName - The name of the project to find.
 * @param {string} [populatePath] - Optional path(s) to populate in the query.
 * @param {ProjectionType<IProject>} [projection] - Optional projection for the query.
 * @param {SessionOption} [sessionOption] - Optional session option for the query.
 * @returns {Promise<IProject>} A promise that resolves to the found project.
 * @throws {AppError} If the project is not found (HTTP 404) or if an error occurs during the operation.
 */
const findProjectByName = async (
  projectName: string, populatePath?: string | null, projection?: ProjectionType<IProject>, sessionOption?: SessionOption
): Promise<IProject> => {
  let findQuery = Project.findOne({ projectName }, projection, sessionOption);

  // If a populate path is provided, add population to the query
  if (populatePath) {
    findQuery = findQuery.populate(populatePath);
  }

  return findQuery.exec().then((project) => {
    if (!project) throw new AppError(HttpStatusCode.NotFound, `No project with the name '${projectName}' found.`);
    return project;
  }).catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while finding the project with the name '${projectName}'.`);
  });
};

/**
 * Creates a new project or updates an existing one.
 *
 * This function sends the project files to the test runner service to build a Docker image for the project.
 * Afterward, it creates an Upload document associated with the project files and saves the project with these changes.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {IProject} project - The project to create or update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object containing the created or
 *                                                                updated project and Docker image information.
 * @throws {AppError} If any error occurs during project creation or update.
 */
const saveProject = async (
  user: IUser, project: IProject, requestFile: RequestFile
): Promise<{ project: IProject; dockerImage: object }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`${project.isNew ? 'Creating' : 'Updating'} a project with the name '${project.projectName}'.`);

    // Step 1: Upload files and get the upload document saved
    project.upload = await uploadService.uploadZipBuffer(
      user, project.projectName, requestFile.buffer, project.upload, { session });

    // Step 2: Call the test runner service to build the Docker image
    const testRunnerOutput = await testRunnerProjectApi.uploadProject(
      project.projectName, requestFile);
    project.tests = testRunnerOutput?.output?.tests?.map((test) => ({ test, weight: 1.0 })) || [];

    // Step 3: Create or update project
    const projectSaved = await project.leanSave({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ${project.isNew ? 'created' : 'updated'} a project with the name '${project.projectName}'.`);
      return { project: projectSaved, dockerImage: testRunnerOutput?.image };
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors
    throw errorUtils.handleError(err, `An error occurred while ${project.isNew ? 'creating' : 'updating'} a project.`);
  } finally {
    await session.endSession();
  }
};

/**
 * Builds and creates a new project with the given name from a ZIP buffer.
 * If a project with the same name already exists, it fails.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the new project.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {ITestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the created project and Docker image information.
 * @throws {AppError} If a project with the same name already exists (409) or if any error occurs during project creation.
 */
const buildAndCreateProject = async (
  user: IUser, projectName: string, requestFile: RequestFile, execArgs: ITestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Check if a project with the same name already exists
  const projectExists = await Project.exists({ projectName });
  if (projectExists) throw new AppError(HttpStatusCode.Conflict, `A project with the name '${projectName}' already exists.`);

  const newProject = new Project({ projectName, testExecutionArguments: execArgs }); // Create new project
  return await saveProject(user, newProject, requestFile);
};

/**
 * Rebuilds and updates an existing project with the new ZIP buffer.
 * If the project does not exist, it fails.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the existing project to update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {ITestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the updated project and Docker image information.
 * @throws {AppError} If the project does not exist (404) or if any error occurs during project update.
 */
const rebuildAndUpdateProject = async (
  user: IUser, projectName: string, requestFile: RequestFile, execArgs: ITestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Find the existing project
  const existingProject = await findProjectByName(projectName, 'upload');
  existingProject.testExecutionArguments = execArgs; // Update the existing project's test execution arguments

  return await saveProject(user, existingProject, requestFile);
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
  const existingProject = await findProjectByName(projectName, 'upload');

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
    throw errorUtils.handleError(err, `An error occurred while updating test weights and execution arguments of the ${projectName} project.`);
  });
};

/**
 * Downloads the uploaded files associated with the project.
 *
 * @param {string} projectName - The name of the project.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer containing project files.
 * @throws {AppError} If the project does not exist (HTTP 404) or if there's an error during the download (HTTP 500).
 */
const downloadProjectFiles = (projectName: string): Promise<Buffer> => findProjectByName(projectName, 'upload', 'upload')
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
    await findProjectByName(projectName, 'upload', 'upload', { session })
      .then(({ upload }) => uploadService.deleteUpload(upload, { session }));

    // Step 2: Delete the project from the DB
    await Project.deleteOne({ projectName }, { session }).exec().then(({ deletedCount }) => {
      if (!deletedCount) throw new Error();
    }).catch((err: AppError | Error | unknown) => {
      throw new AppError(HttpStatusCode.InternalServerError, `Failed to delete the ${projectName} project.`, (err as Error)?.message); // Should not happen normally!
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
    throw errorUtils.handleError(err, `An error occurred while deleting the ${projectName} project.`);
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
