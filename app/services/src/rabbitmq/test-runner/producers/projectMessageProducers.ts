import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import { IProject } from '@models/Project';
import MessageRequest from '@models/MessageRequest';
import type { IMessageRequest } from '@models/MessageRequest';

import RabbitExchangeProducer from '@rabbitmq/helpers/RabbitExchangeProducer';

import TestRunnerResponse from '@rabbitmq/test-runner/dto/responses/TestRunnerResponse';
import ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';
import ContainerExecutionStatus from '@rabbitmq/test-runner/dto/responses/enums/ContainerExecutionStatus';

import rabbitResponseUtils from '@rabbitmq/test-runner/utils/testRunnerResponseUtils';
import rabbitErrorUtils from '@rabbitmq/test-runner/utils/testRunnerErrorUtils';

import messageRequestServices from '@services/messageRequestServices';
import projectServices from '@services/projectServices';

const { RABBITMQ_EXCHANGE_PROJECT_UPLOAD, RABBITMQ_EXCHANGE_PROJECT_REMOVAL } = process.env;
if (!RABBITMQ_EXCHANGE_PROJECT_UPLOAD || !RABBITMQ_EXCHANGE_PROJECT_REMOVAL) throw new Error('Missing environment variables!');

const PROJECT_UPLOAD_MESSAGE_LIMIT = 1;
const PROJECT_REMOVAL_MESSAGE_LIMIT = 5;

const projectUploadMessageProducer = RabbitExchangeProducer.create(
  RABBITMQ_EXCHANGE_PROJECT_UPLOAD, 'fanout', PROJECT_UPLOAD_MESSAGE_LIMIT);
const projectRemovalMessageProducer = RabbitExchangeProducer.create(
  RABBITMQ_EXCHANGE_PROJECT_REMOVAL, 'fanout', PROJECT_REMOVAL_MESSAGE_LIMIT);

/**
 * Produces and sends a message to upload the provided project to the Test Runner service for Docker image building.
 *
 * @param {IUser} deployer - The user initiating the project upload.
 * @param {string} projectName - The name of the project to upload.
 * @param {Buffer} zipBuffer - The ZIP buffer containing project files.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the message request created for the upload.
 * @throws {AppError} If any error occurs during the upload process.
 */
const produceProjectUploadMessage = async (
  deployer: IUser, projectName: string, zipBuffer: Buffer
): Promise<IMessageRequest> => {
  Logger.info(`Uploading ${projectName} project to the Test Runner service to build the Docker image.`);
  const messageRequest = new MessageRequest({ deployer, channel: RABBITMQ_EXCHANGE_PROJECT_UPLOAD });

  await projectUploadMessageProducer.then((producer) => producer.sendExchange(
    Buffer.from(JSON.stringify({ projectName, zipBuffer })),
    async (message: string) => {
      const response: {
        isError: boolean; data: ContainerExecutionResponse | AppError;
      } = rabbitResponseUtils.handleRabbitResponse<ContainerExecutionResponse>(
        JSON.parse(message) as TestRunnerResponse,
        {
          successMessage: `Successfully uploaded ${projectName} project to the Test Runner service to build the Docker image.`,
          errorMessage: 'An error occurred while uploading the project to the Test Runner service.'
        }
      );

      // Update project with test runner output if the container execution succeeded; otherwise, handle error
      let project;
      if ((response.data as ContainerExecutionResponse).status === ContainerExecutionStatus.SUCCESS) {
        project = await projectServices.updateProjectWithTestRunnerOutput(
          projectName, response.data as ContainerExecutionResponse);
      } else {
        project = await projectServices.findProjectByName(projectName, '_id', '_id');
        response.data = rabbitErrorUtils.handleContainerError(response.data as ContainerExecutionResponse);
      }

      await messageRequestServices.updateMessageRequest(messageRequest, project._id, 'Project', response);
    },
    { waitForAllCustomers: true }
  ));

  return await messageRequestServices.saveMessageRequest(messageRequest);
};

/**
 * Produces and sends a message requesting the removal of the specified project's Docker image from the Test Runner service.
 *
 * @param {IUser} deployer - The user initiating the project removal.
 * @param {IProject} project - The project to be removed.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the message request created for the removal.
 * @throws {AppError} If any error occurs during the removal process.
 */
const produceProjectRemovalMessage = async (
  deployer: IUser, project: IProject
): Promise<IMessageRequest> => {
  Logger.info(`Sending a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`);
  const messageRequest = new MessageRequest({ deployer, channel: RABBITMQ_EXCHANGE_PROJECT_REMOVAL });

  await projectRemovalMessageProducer.then((producer) => producer.sendExchange(
    Buffer.from(project.projectName),
    async (message: string) => {
      const response = rabbitResponseUtils.handleRabbitResponse<object>(
        JSON.parse(message) as TestRunnerResponse,
        {
          successMessage: `Successfully sent a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`,
          errorMessage: `An error occurred while sending a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`
        }
      );

      await messageRequestServices.updateMessageRequest(messageRequest, project._id, 'Project', response);
    },
    { waitForAllCustomers: true }
  ));

  return await messageRequestServices.saveMessageRequest(messageRequest);
};

export default { produceProjectUploadMessage, produceProjectRemovalMessage };
