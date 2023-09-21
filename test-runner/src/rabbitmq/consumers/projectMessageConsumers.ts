import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import RabbitExchangeConsumer from '@rabbitmq/helpers/RabbitExchangeConsumer';

import ProjectUploadMessage from '@rabbitmq/dto/incoming-messages/ProjectUploadMessage';
import ReplyMessage from '@rabbitmq/dto/outgoing-messages/ReplyMessage';
import FailedReplyMessage from '@rabbitmq/dto/outgoing-messages/FailedReplyMessage';

import projectServices from '@services/projectServices';
import dockerImageServices from '@services/dockerImageServices';

const { RABBITMQ_EXCHANGE_PROJECT_UPLOAD, RABBITMQ_EXCHANGE_PROJECT_REMOVAL } = process.env;
if (!RABBITMQ_EXCHANGE_PROJECT_UPLOAD || !RABBITMQ_EXCHANGE_PROJECT_REMOVAL) throw new Error('Missing environment variables!');

const PROJECT_UPLOAD_MESSAGE_LIMIT = 1;
const PROJECT_REMOVAL_MESSAGE_LIMIT = 5;

const consumeProjectUploadMessages = (
  consumer: RabbitExchangeConsumer
): Promise<string | undefined> => consumer.consumeExchange(async (message: string) => {
  const { projectName, zipBuffer }: ProjectUploadMessage = JSON.parse(message);
  Logger.info(`Received a project upload request for the ${projectName} project.`);

  return projectServices.saveProject(projectName, Buffer.from(zipBuffer.data))
    .then(({ isNew, project }) => {
      Logger.info(`Successfully processed the project upload request for the ${projectName} project.`);
      return new ReplyMessage(isNew ? HttpStatusCode.Created : HttpStatusCode.Ok, project);
    })
    .catch((err: Error | unknown) => {
      Logger.error(`An error occurred while processing the project upload request for the ${projectName} project.`);
      return new FailedReplyMessage(err);
    });
});

const consumeProjectRemovalMessages = (
  consumer: RabbitExchangeConsumer
): Promise<string | undefined> => consumer.consumeExchange(async (projectName: string) => {
  Logger.info(`Received a deletion request for the ${projectName} project.`);

  return dockerImageServices.deleteDockerImage(projectName)
    .then(() => {
      Logger.info(`Successfully processed the deletion request for the ${projectName} project.`);
      return new ReplyMessage(HttpStatusCode.NoContent);
    })
    .catch((err: Error | unknown) => {
      Logger.error(`An error occurred while processing the deletion request for the ${projectName} project.`);
      return new FailedReplyMessage(err);
    });
});

const initializeMessageConsumers = async (): Promise<void> => {
  const projectUploadMessageConsumer = await RabbitExchangeConsumer.create(
    RABBITMQ_EXCHANGE_PROJECT_UPLOAD, PROJECT_UPLOAD_MESSAGE_LIMIT, 'fanout');
  const projectRemovalMessageConsumer = await RabbitExchangeConsumer.create(
    RABBITMQ_EXCHANGE_PROJECT_REMOVAL, PROJECT_REMOVAL_MESSAGE_LIMIT, 'fanout');

  return Promise.all([
    consumeProjectUploadMessages(projectUploadMessageConsumer),
    consumeProjectRemovalMessages(projectRemovalMessageConsumer)
  ]).then((consumers) => {
    Logger.info(`Project message consumers are waiting for messages: ${consumers.join(', ')}`);
  }).catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while setting up the project message consumers.');
  });
};

export default { initializeMessageConsumers };
