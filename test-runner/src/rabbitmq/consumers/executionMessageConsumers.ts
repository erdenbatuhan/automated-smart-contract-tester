import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import RabbitQueueConsumer from '@rabbitmq/helpers/RabbitQueueConsumer';

import UploadMessage from '@rabbitmq/dto/incoming-messages/UploadMessage';
import ReplyMessage from '@rabbitmq/dto/outgoing-messages/ReplyMessage';
import FailedReplyMessage from '@rabbitmq/dto/outgoing-messages/FailedReplyMessage';

import executionServices from '@services/executionServices';

const { RABBITMQ_QUEUE_SUBMISSION_UPLOAD } = process.env;
if (!RABBITMQ_QUEUE_SUBMISSION_UPLOAD) throw new Error('Missing environment variables!');

const EXECUTION_MESSAGE_LIMIT = 10;

const consumeExecutionMessages = (
  consumer: RabbitQueueConsumer
): Promise<string | undefined> => consumer.consumeQueue(async (message: string) => {
  const { projectName, zipBuffer, options } = JSON.parse(message) as UploadMessage;
  Logger.info(`Received a submission for the ${projectName} project.`);

  return executionServices.executeTests(projectName, Buffer.from(zipBuffer.data), options)
    .then((execution) => {
      Logger.info(`Successfully processed the submission received for the ${projectName} project.`);
      return new ReplyMessage(HttpStatusCode.Created, execution);
    })
    .catch((err: Error | unknown) => {
      Logger.error(`An error occurred while processing the submission received for the ${projectName} project.`);
      return new FailedReplyMessage(err);
    });
});

const initializeMessageConsumers = async (): Promise<void> => {
  const executionMessageConsumer = await RabbitQueueConsumer.create(RABBITMQ_QUEUE_SUBMISSION_UPLOAD, EXECUTION_MESSAGE_LIMIT);

  return Promise.all([
    consumeExecutionMessages(executionMessageConsumer)
  ]).then((consumers) => {
    Logger.info(`Execution message consumers are waiting for messages: ${consumers.join(', ')}`);
  }).catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while setting up the execution message consumers.');
  });
};

export default { initializeMessageConsumers };
