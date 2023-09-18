import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@logging/Logger';
import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import Project from '@models/Project';
import type { IProject } from '@models/Project';
import { IProjectConfig } from '@models/schemas/ProjectConfigSchema';

import uploadServices from '@services/uploadServices';

import testRunnerProjectApi from '@api/services/testrunner/projectApi';
import type ContainerExecutionResponse from '@api/services/testrunner/types/ContainerExecutionResponse';

import errorUtils from '@utils/errorUtils';
import type { RequestFile } from '@utils/routerUtils';

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
    throw errorUtils.handleError(err, 'An error occurred while finding all projects.');
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
  projectName: string, populatePath?: string | null, projection?: ProjectionType<IProject>, sessionOption?: SessionOption
): Promise<IProject> => {
  // If a populate path is provided, add population to the query
  let findQuery = Project.findOne({ projectName }, projection, sessionOption);
  if (populatePath) findQuery = findQuery.populate(populatePath);

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
 * @returns {Promise<IProject>} A promise that resolves to the created or updated project.
 * @throws {AppError} If any error occurs during project creation or update.
 */
const saveProject = async (user: IUser, project: IProject, requestFile: RequestFile): Promise<IProject> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`${project.isNew ? 'Creating' : 'Updating'} a project with the name '${project.projectName}'.`);

    // Step 1: Upload files and get the upload document saved
    project.upload = await uploadServices.uploadZipBuffer(
      user, project.projectName, requestFile.buffer, project.upload, { session });

    // Step 2: Call the test runner service to build the Docker image
    const testRunnerOutput = await testRunnerProjectApi.uploadProject(
      project.projectName, requestFile);

    // Step 3: Update project config and output based on the test runner output
    project.config.tests = testRunnerOutput?.container?.output?.tests?.map((test) => ({ ...test, weight: 1.0 })) || [];
    project.output = testRunnerOutput;

    // Step 4: Create or update project
    const projectSaved = await project.leanSave({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ${project.isNew ? 'created' : 'updated'} a project with the name '${project.projectName}'.`);
      return projectSaved;
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
 * @param {IProjectConfig} [config] - The "optional" project configuration
 *                                    (Providing "tests" is redundant as it will be overridden anyway).
 * @returns {Promise<IProject>} A promise that resolves to the created project.
 * @throws {AppError} If a project with the same name already exists (409) or if any error occurs during project creation.
 */
const buildAndCreateProject = async (
  user: IUser, projectName: string, requestFile: RequestFile, config?: IProjectConfig
): Promise<IProject> => {
  // Check if a project with the same name already exists
  const projectExists = await Project.exists({ projectName });
  if (projectExists) throw new AppError(HttpStatusCode.Conflict, `A project with the name '${projectName}' already exists.`);

  // Create a new project
  const newProject = new Project({ projectName, config: config || {} });
  return await saveProject(user, newProject, requestFile);
};

/**
 * Rebuilds and updates an existing project with the new ZIP buffer.
 * If the project does not exist, it fails.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the existing project to update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {IProjectConfig} [config] - The "optional" project configuration
 *                                    (Providing "tests" is redundant as it will be overridden anyway).
 * @returns {Promise<IProject>} A promise that resolves to the updated project.
 * @throws {AppError} If the project does not exist (404) or if any error occurs during project update.
 */
const rebuildAndUpdateProject = async (
  user: IUser, projectName: string, requestFile: RequestFile, config?: IProjectConfig
): Promise<IProject> => {
  // Find the existing project
  const existingProject = await findProjectByName(projectName, 'upload');

  // Update the existing project's config, if provided
  if (config) {
    existingProject.config = config;
  }

  return await saveProject(user, existingProject, requestFile);
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
    throw errorUtils.handleError(err, `An error occurred while updating the config of the ${projectName} project.`);
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
      .then(({ upload }) => uploadServices.deleteUpload(upload, { session }));

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

/**
 * Uploads all projects to the test runner service by fetching them from the database,
 * creating ZIP archives, and sending them to the test runner service.
 *
 * @throws {AppError |Error | unknown} If an error occurs during the process.
 * @returns {Promise<ContainerExecutionResponse['dockerImage']['imageID'][]>} A Promise that resolves to an array of
 *                                                                            Docker image IDs for the uploaded projects.
 */
const uploadAllProjectsToTestRunner = async (): Promise<ContainerExecutionResponse['dockerImage']['imageID'][]> => {
  Logger.info('Fetching all projects from the DB.');
  const projects = await findAllProjects('upload');

  Logger.info(`Uploading ${projects.length} project(s) to the test runner service.`);
  return Promise.all(projects.map(({ projectName, upload }) => {
    const zipBuffer = uploadServices.downloadUploadedFiles(`${projectName} project`, upload);
    const requestFile = {
      fieldname: 'projectZip',
      originalname: `${projectName}.zip`,
      buffer: zipBuffer
    } as unknown as RequestFile;

    return testRunnerProjectApi.uploadProject(projectName, requestFile);
  })).then((responses) => {
    const dockerImageIds = responses.map(({ dockerImage }) => dockerImage.imageID);

    Logger.info(`Successfully uploaded all projects to the test runner service and created the docker images: ${dockerImageIds.join(', ')}`);
    return dockerImageIds;
  }).catch((err: AppError | Error | unknown) => {
    throw errorUtils.handleError(err, 'An error occurred while uploading all projects to the test runner service.');
  });
};

export default {
  findAllProjects,
  findProjectByName,
  buildAndCreateProject,
  rebuildAndUpdateProject,
  updateProjectConfig,
  downloadProjectFiles,
  deleteProject,
  uploadAllProjectsToTestRunner
};
