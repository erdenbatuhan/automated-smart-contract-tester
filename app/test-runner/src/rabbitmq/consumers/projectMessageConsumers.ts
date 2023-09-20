import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import RabbitExchangeConsumer from '@rabbitmq/helpers/RabbitExchangeConsumer';

import ProjectUploadMessage from '@rabbitmq/dto/requests/ProjectUploadMessage';
import ProjectRemovalMessage from '@rabbitmq/dto/requests/ProjectRemovalMessage';
import RabbitResponse from '@rabbitmq/dto/responses/RabbitResponse';
import RabbitErrorResponse from '@rabbitmq/dto/responses/RabbitErrorResponse';

import projectServices from '@services/projectServices';
import dockerImageServices from '@services/dockerImageServices';

const { RABBITMQ_EXCHANGE_PROJECT_UPLOAD, RABBITMQ_EXCHANGE_PROJECT_REMOVAL } = process.env;
if (!RABBITMQ_EXCHANGE_PROJECT_UPLOAD || !RABBITMQ_EXCHANGE_PROJECT_REMOVAL) throw new Error('Missing environment variables!');

const consumeProjectUploadMessages = (): Promise<string | undefined> => new RabbitExchangeConsumer()
  .consumeExchange(RABBITMQ_EXCHANGE_PROJECT_UPLOAD, 'fanout', async (message: string) => {
    const { projectName, zipBuffer }: ProjectUploadMessage = JSON.parse(message);
    Logger.info(`Received a project upload request for the ${projectName} project.`);

    return projectServices.saveProject(projectName, Buffer.from(zipBuffer.data))
      .then(({ isNew, project }) => {
        Logger.info(`Successfully processed the project upload request for the ${projectName} project.`);
        return new RabbitResponse(isNew ? HttpStatusCode.Created : HttpStatusCode.Ok, project);
      })
      .catch((err: Error | unknown) => {
        Logger.error(`An error occurred while processing the project upload request for the ${projectName} project.`);
        return new RabbitErrorResponse(err);
      });
  });

const consumeProjectRemovalMessages = (): Promise<string | undefined> => new RabbitExchangeConsumer()
  .consumeExchange(RABBITMQ_EXCHANGE_PROJECT_REMOVAL, 'fanout', async (message: string) => {
    const { projectName }: ProjectRemovalMessage = JSON.parse(message);
    Logger.info(`Received a deletion request for the ${projectName} project.`);

    return dockerImageServices.deleteDockerImage(projectName)
      .then(() => {
        Logger.info(`Successfully processed the deletion request for the ${projectName} project.`);
        return new RabbitResponse(HttpStatusCode.NoContent);
      })
      .catch((err: Error | unknown) => {
        Logger.error(`An error occurred while processing the deletion request for the ${projectName} project.`);
        return new RabbitErrorResponse(err);
      });
  });

const initializeMessageConsumers = async (): Promise<void> => Promise.all([
  consumeProjectUploadMessages(),
  consumeProjectRemovalMessages()
]).then((consumers) => {
  Logger.info(`Project message consumers are waiting for messages: ${consumers.join(', ')}`);
}).catch((err: Error | unknown) => {
  throw AppError.createAppError(err, 'An error occurred while setting up the project message consumers.');
});

export default { initializeMessageConsumers };
