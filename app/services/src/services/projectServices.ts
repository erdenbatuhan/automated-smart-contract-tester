import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import Project from '@models/Project';
import type { IProject } from '@models/Project';
import type { IProjectConfig } from '@models/schemas/ProjectConfigSchema';
import type ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

import uploadServices from '@services/uploadServices';

/**
 * Finds all projects.
 *
 * @param {string} [populatePath] - Optional path(s) to populate in the query.
 * @returns {Promise<IProject[]>} A promise that resolves to an array of all projects.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllProjects = async (populatePath?: string | null): Promise<IProject[]> => {
  // If a populate path is provided, add population to the query
  let findQuery = Project.find();
  if (populatePath) findQuery = findQuery.populate(populatePath);

  return findQuery.exec().catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while finding all projects.');
  });
};

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
  projectName: string, populatePath?: string | null, projection?: ProjectionType<IProject> | null, sessionOption?: SessionOption
): Promise<IProject> => {
  // If a populate path is provided, add population to the query
  let findQuery = Project.findOne({ projectName }, projection, sessionOption);
  if (populatePath) findQuery = findQuery.populate(populatePath);

  return findQuery.exec().then((project) => {
    if (!project) throw new AppError(HttpStatusCode.NotFound, `No project with the name '${projectName}' found.`);
    return project;
  }).catch((err: Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while finding the project with the name '${projectName}'.`);
  });
};

/**
 * Creates a new project or updates an existing one.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {IProject} project - The project to create or update.
 * @param {Buffer} zipBuffer - The zip buffer containing the project files.
 * @returns {Promise<IProject>} A promise that resolves to the created or updated project.
 * @throws {AppError} If any error occurs during project creation or update.
 */
const saveProject = async (user: IUser, project: IProject, zipBuffer: Buffer): Promise<IProject> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`${project.isNew ? 'Creating' : 'Updating'} a project with the name '${project.projectName}'.`);

    // Upload files and get the upload document saved
    project.upload = await uploadServices.uploadZipBuffer(
      user, project.projectName, zipBuffer, project.upload, { session });

    // Create or update project
    const projectSaved = await project.save({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ${project.isNew ? 'created' : 'updated'} a project with the name '${project.projectName}'.`);
      return projectSaved;
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors
    throw AppError.createAppError(err, `An error occurred while ${project.isNew ? 'creating' : 'updating'} a project.`);
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
 * @param {Buffer} zipBuffer - The zip buffer containing the project files.
 * @param {IProjectConfig} [config] - The "optional" project configuration
 *                                    (Providing "tests" is redundant as it will be overridden anyway).
 * @returns {Promise<IProject>} A promise that resolves to the created project.
 * @throws {AppError} If a project with the same name already exists (409) or if any error occurs during project creation.
 */
const buildAndCreateProject = async (
  user: IUser, projectName: string, zipBuffer: Buffer, config?: IProjectConfig
): Promise<IProject> => {
  // Check if a project with the same name already exists
  const projectExists = await Project.exists({ projectName });
  if (projectExists) throw new AppError(HttpStatusCode.Conflict, `A project with the name '${projectName}' already exists.`);

  // Create a new project
  const newProject = new Project({ projectName, config: config || {} });
  return await saveProject(user, newProject, zipBuffer);
};

/**
 * Rebuilds and updates an existing project with the new ZIP buffer.
 * If the project does not exist, it fails.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the existing project to update.
 * @param {Buffer} zipBuffer - The zip buffer containing the project files.
 * @param {IProjectConfig} [config] - The "optional" project configuration
 *                                    (Providing "tests" is redundant as it will be overridden anyway).
 * @returns {Promise<IProject>} A promise that resolves to the updated project.
 * @throws {AppError} If the project does not exist (404) or if any error occurs during project update.
 */
const rebuildAndUpdateProject = async (
  user: IUser, projectName: string, zipBuffer: Buffer, config?: IProjectConfig
): Promise<IProject> => {
  // Find the existing project
  const existingProject = await findProjectByName(projectName, 'upload');

  // Clear the project's previous config and output
  existingProject.config = { tests: [] };
  existingProject.output = {};

  // Update the existing project's config, if provided
  if (config) existingProject.config = config;

  return await saveProject(user, existingProject, zipBuffer);
};

/**
 * Updates a project with the test runner's output data.
 *
 * @param {string} projectName - The name of the project to update.
 * @param {ContainerExecutionResponse} testRunnerOutput - The test runner's execution output.
 * @returns {Promise<IProject['_id']>} A Promise that resolves to the ID of the updated project.
 * @throws {AppError} If an error occurs while updating the project.
 */
const updateProjectWithTestRunnerOutput = async (
  projectName: string, testRunnerOutput: ContainerExecutionResponse
): Promise<IProject['_id']> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Updating project '${projectName}' with test runner output.`);
    const project = await findProjectByName(projectName, null, null, { session });

    // Process output, e.g., extract tests
    project.config.tests = testRunnerOutput?.container?.output?.tests?.map((test) => ({ ...test, weight: 1.0 })) || [];
    project.output = testRunnerOutput;

    // Update the project and commit transaction
    const updatedProjectId = await project.save({ session }).then(({ _id }) => _id);
    await session.commitTransaction();

    Logger.info(`Project '${projectName}' updated successfully.`);
    return updatedProjectId;
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();
    throw AppError.createAppError(err, `Error updating project '${projectName}': ${(err as Error).message}`);
  } finally {
    await session.endSession();
  }
};

/**
 * Update the configuration of an existing project, including test weights, container timeout and execution arguments.
 *
 * @param {string} projectName - The name of the project to update.
 * @param {IProjectConfig} updatedConfig - The object containing updated project configuration values for the tests.
 * @returns {Promise<IProject>} A promise that resolves to the updated project.
 * @throws {AppError} If the project doesn't exist (404), if there's a server error during the update (500),
 *                    or if any error occurs while updating the project configuration.
 */
const updateProjectConfig = async (
  projectName: string, updatedConfig: IProjectConfig
): Promise<IProject> => {
  // Find the existing project
  Logger.info(`Updating the config of the ${projectName} project.`);
  const existingProject = await findProjectByName(projectName, 'upload');

  // Update test weights if provided
  if (updatedConfig.tests) {
    existingProject.config.tests = existingProject.config.tests.map((existingTest) => {
      const newWeight = updatedConfig.tests.find(({ test }) => test === existingTest.test)?.weight;
      existingTest.weight = newWeight || existingTest.weight;

      return existingTest;
    });
  }

  // Update the rest of the config, if provided
  if (updatedConfig.containerTimeout) existingProject.config.containerTimeout = updatedConfig.containerTimeout;
  if (updatedConfig.testExecutionArguments) existingProject.config.testExecutionArguments = updatedConfig.testExecutionArguments;

  return existingProject.save().then((project) => {
    Logger.info(`Successfully updated the config of the ${projectName} project.`);
    return project;
  }).catch((err: Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while updating the config of the ${projectName} project.`);
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
  .then(({ upload }) => uploadServices.downloadUploadedFiles(`${projectName} project`, upload));

/**
 * Downloads uploaded files for all projects in the database.
 *
 * @returns {Promise<{ project: IProject; zipBuffer: Buffer }[]>} A promise that resolves to an array of objects,
 *                                                                each containing the project along with the corresponding
 *                                                                ZIP buffer of uploaded files.
 * @throws {AppError} If an error occurs during the operation.
 */
const downloadFilesForAllProjects = async (): Promise<{ project: IProject; zipBuffer: Buffer }[]> => {
  Logger.info('Fetching all projects from the DB.');
  const projects = await findAllProjects('upload');

  try {
    Logger.info('Downloading the uploaded files for each project.');
    const projectFiles = projects.map((project) => {
      const zipBuffer = uploadServices.downloadUploadedFiles(`${project.projectName} project`, project.upload);
      return { project, zipBuffer };
    });
    Logger.info(`Downloaded the uploaded files for ${projects.length} project(s).`);

    return projectFiles;
  } catch (err: Error | unknown) {
    throw AppError.createAppError(err, `An error occurred while downloading the uploaded files for ${projects.length} project(s).`);
  }
};

/**
 * Deletes a project, including its associated upload.
 *
 * @param {string} projectName - The name of the project to delete.
 * @returns {Promise<IProject>} A promise that resolves with the deleted project once the deletion process is successful.
 * @throws {AppError} If there's an error during the deletion process (HTTP 500).
 */
const deleteProject = async (projectName: string): Promise<IProject> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Deleting the ${projectName} project.`);

    // Step 1: Delete the upload associated with the project
    const project = await findProjectByName(projectName, 'upload', null, { session });
    await uploadServices.deleteUpload(project.upload, { session });

    // Step 2: Delete the project from the DB
    await Project.deleteOne({ projectName }, { session }).exec().then(({ deletedCount }) => {
      if (!deletedCount) throw new Error();
    }).catch((err: AppError | Error | unknown) => {
      throw new AppError(HttpStatusCode.InternalServerError, `Failed to delete the ${projectName} project.`, (err as Error)?.message); // Should not happen normally!
    });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully deleted the ${projectName} project.`);
      return project;
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors and throw an AppError with relevant status code and error message
    throw AppError.createAppError(err, `An error occurred while deleting the ${projectName} project.`);
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
  updateProjectWithTestRunnerOutput,
  updateProjectConfig,
  downloadProjectFiles,
  deleteProject,
  downloadFilesForAllProjects
};
