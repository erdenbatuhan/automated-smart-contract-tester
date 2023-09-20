import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import RabbitQueueConsumer from '@rabbitmq/helpers/RabbitQueueConsumer';

import ExecutionMessage from '@rabbitmq/dto/requests/ExecutionMessage';
import RabbitResponse from '@rabbitmq/dto/responses/RabbitResponse';
import RabbitErrorResponse from '@rabbitmq/dto/responses/RabbitErrorResponse';

import executionServices from '@services/executionServices';

const { RABBITMQ_QUEUE_SUBMISSION_UPLOAD } = process.env;
if (!RABBITMQ_QUEUE_SUBMISSION_UPLOAD) throw new Error('Missing environment variables!');

const consumeExecutionMessages = (): Promise<string | undefined> => new RabbitQueueConsumer()
  .consumeQueue(RABBITMQ_QUEUE_SUBMISSION_UPLOAD, async (message: string) => {
    const { projectName, zipBuffer, options } = JSON.parse(message) as ExecutionMessage;
    Logger.info(`Received a submission for the ${projectName} project.`);

    return executionServices.executeTests(projectName, Buffer.from(zipBuffer.data), options)
      .then((execution) => {
        Logger.info(`Successfully processed the submission received for the ${projectName} project.`);
        return new RabbitResponse(HttpStatusCode.Created, execution);
      })
      .catch((err: Error | unknown) => {
        Logger.error(`An error occurred while processing the submission received for the ${projectName} project.`);
        return new RabbitErrorResponse(err);
      });
  });

const initializeMessageConsumers = async (): Promise<void> => Promise.all([
  consumeExecutionMessages()
]).then((consumers) => {
  Logger.info(`Execution message consumers are waiting for messages: ${consumers.join(', ')}`);
}).catch((err: Error | unknown) => {
  throw AppError.createAppError(err, 'An error occurred while setting up the execution message consumers.');
});

export default { initializeMessageConsumers };
