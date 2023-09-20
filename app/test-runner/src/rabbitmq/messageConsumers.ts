import Logger from '@Logger';
import AppError from '@errors/AppError';

import projectMessageConsumers from '@rabbitmq/consumers/projectMessageConsumers';
import executionMessageConsumers from '@rabbitmq/consumers/executionMessageConsumers';

const initializeMessageConsumers = (): Promise<void> => Promise.all([
  projectMessageConsumers.initializeMessageConsumers(),
  executionMessageConsumers.initializeMessageConsumers()
]).then((consumers) => {
  Logger.info(`Initialized ${consumers.length} message consumer(s).`);
}).catch((err: AppError) => {
  throw AppError.createAppError(err, 'Could not initialize message consumers.');
});

export default { initializeMessageConsumers };
