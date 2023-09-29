import Logger from '@Logger';

import type { IUser } from '@models/User';
import type { IProject } from '@models/Project';
import MessageRequest from '@models/MessageRequest';
import type { IMessageRequest } from '@models/MessageRequest';

import RabbitExchangeProducer from '@rabbitmq/helpers/RabbitExchangeProducer';

import TestRunnerResponse from '@rabbitmq/test-runner/dto/responses/TestRunnerResponse';
import ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

import testRunnerResponseUtils from '@rabbitmq/test-runner/utils/testRunnerResponseUtils';

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
 * @param {IUser | null} deployer - The user initiating the project upload.
 *                                  "`null` indicates the system user - calls originated from the business logic without a user"
 * @param {Buffer} zipBuffer - The ZIP buffer containing project files.
 * @param {IProject} project - The project to upload.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the message request created for the upload.
 * @throws {AppError} If any error occurs during the upload process.
 */
const produceProjectUploadMessage = async (
  deployer: IUser | null, zipBuffer: Buffer, project: IProject
): Promise<IMessageRequest> => {
  const deployerEmail = deployer ? deployer.email : 'sys-user';
  Logger.info(`[${deployerEmail}] Uploading ${project.projectName} project to the Test Runner service to build the Docker image.`);

  const messageRequest = new MessageRequest({ deployer, channel: RABBITMQ_EXCHANGE_PROJECT_UPLOAD });
  const payload = {
    projectName: project.projectName,
    zipBuffer,
    options: { containerTimeout: project.config?.containerTimeout, execArgs: project.config?.testExecutionArguments }
  };

  await projectUploadMessageProducer.then((producer) => producer.sendExchange(
    Buffer.from(JSON.stringify(payload)),
    async (message: string) => {
      const response = testRunnerResponseUtils.handleRabbitResponse<ContainerExecutionResponse>(
        JSON.parse(message) as TestRunnerResponse,
        {
          successMessage: `[${deployerEmail}] Successfully uploaded ${project.projectName} project to the Test Runner service to build the Docker image.`,
          errorMessage: `[${deployerEmail}] An error occurred while uploading the project to the Test Runner service.`
        }
      );

      // Update the project with test runner output
      await projectServices.updateProjectWithTestRunnerOutput(project.projectName, response.data as ContainerExecutionResponse);
      await messageRequestServices.updateMessageRequest(messageRequest, project._id, 'Project', response);
    },
    { waitForAllCustomers: true }
  ));

  return await messageRequestServices.saveMessageRequest(messageRequest);
};

/**
 * Produces and sends a message requesting the removal of the specified project's Docker image from the Test Runner service.
 *
 * @param {IUser | null} deployer - The user initiating the project removal.
 *                                  "`null` indicates the system user - calls originated from the business logic without a user"
 * @param {IProject} project - The project to be removed.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the message request created for the removal.
 * @throws {AppError} If any error occurs during the removal process.
 */
const produceProjectRemovalMessage = async (
  deployer: IUser | null, project: IProject
): Promise<IMessageRequest> => {
  const deployerEmail = deployer ? deployer.email : 'sys-user';
  Logger.info(`[${deployerEmail}] Sending a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`);

  const messageRequest = new MessageRequest({ deployer, channel: RABBITMQ_EXCHANGE_PROJECT_REMOVAL });
  const payload = project.projectName;

  await projectRemovalMessageProducer.then((producer) => producer.sendExchange(
    Buffer.from(payload),
    async (message: string) => {
      const response = testRunnerResponseUtils.handleRabbitResponse<object>(
        JSON.parse(message) as TestRunnerResponse,
        {
          successMessage: `[${deployerEmail}] Successfully sent a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`,
          errorMessage: `[${deployerEmail}] An error occurred while sending a project deletion request to the Test Runner service for the ${project.projectName} project to remove its Docker image.`
        }
      );

      await messageRequestServices.updateMessageRequest(messageRequest, project._id, 'Project', response);
    },
    { waitForAllCustomers: true }
  ));

  return await messageRequestServices.saveMessageRequest(messageRequest);
};

export default { produceProjectUploadMessage, produceProjectRemovalMessage };
