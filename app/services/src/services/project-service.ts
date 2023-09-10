import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import Project from '@models/project';
import type { TestExecutionArguments, IProject } from '@models/project';

import uploadService from '@services/upload-service';

import testRunnerProjectApi from '@api/test-runner/project-api';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';

/**
 * Find all projects.
 *
 * @returns {Promise<IProject[]>} A promise that resolves to an array of all projects.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllProjects = async (): Promise<IProject[]> => Project.find().exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(
      new AppError(500, 'An error occurred while finding all projects.', (err as Error)?.message));
  });

/**
 * Find a project by its name.
 *
 * @param {string} projectName - The name of the project to find.
 * @param {ProjectionType<IProject>} projection - Optional projection for query.
 * @param {SessionOption} sessionOption - Optional session option for query.
 * @returns {Promise<IProject>} A promise that resolves to the found project.
 * @throws {AppError} If the project is not found or if an error occurs during the operation.
 */
const findProjectByName = (
  projectName: string, projection?: ProjectionType<IProject>, sessionOption?: SessionOption
): Promise<IProject> => Project.findOne({ projectName }, projection, sessionOption).populate('upload').exec()
  .then((project) => {
    if (!project) throw new AppError(404, `No project with the name '${projectName}' found.`);
    return project;
  })
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while finding the project with the name '${projectName}'.`,
      (err as AppError)?.reason || (err as Error)?.message)
    );
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

    // Call the test runner service to build the Docker image
    const testRunnerOutput = await testRunnerProjectApi.uploadProjectToTestRunnerService(
      project.projectName, requestFile);
    project.tests = testRunnerOutput?.output?.tests?.map((test) => ({ test, weight: 1.0 })) || [];

    // Upload files and get the upload document saved
    project.upload = await uploadService.uploadZipBuffer(
      project.projectName, requestFile.buffer, project.upload, { session });

    // Create or update project
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
      (err as AppError)?.reason || (err as Error)?.message)
    );
  } finally {
    await session.endSession();
  }
};

/**
 * Creates a new project with the given name from a ZIP buffer.
 * If a project with the same name already exists, it fails.
 *
 * @param {string} projectName - The name of the new project.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {TestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the created project and Docker image information.
 * @throws {AppError} If a project with the same name already exists (409) or if any error occurs during project creation.
 */
const createNewProject = async (
  projectName: string, requestFile: RequestFile, execArgs: TestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Check if a project with the same name already exists
  const projectExists = await Project.exists({ projectName });
  if (projectExists) throw new AppError(409, `A project with the name '${projectName}' already exists.`);

  const newProject = new Project({ projectName, testExecutionArguments: execArgs }); // Create new project
  return await saveProject(newProject, requestFile);
};

/**
 * Updates an existing project with the new ZIP buffer.
 * If the project does not exist, it fails.
 *
 * @param {string} projectName - The name of the existing project to update.
 * @param {RequestFile} requestFile - The file attached to the request containing the project files.
 * @param {TestExecutionArguments} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<{ project: IProject; dockerImage: object }>} A promise that resolves to an object
 *                                                                containing the updated project and Docker image information.
 * @throws {AppError} If the project does not exist (404) or if any error occurs during project update.
 */
const updateExistingProject = async (
  projectName: string, requestFile: RequestFile, execArgs: TestExecutionArguments
): Promise<{ project: IProject; dockerImage: object }> => {
  // Find the existing project
  const existingProject = await findProjectByName(projectName);
  existingProject.testExecutionArguments = execArgs; // Update the existing project's test execution arguments

  return await saveProject(existingProject, requestFile);
};

export default {
  findAllProjects,
  findProjectByName,
  createNewProject,
  updateExistingProject
};
