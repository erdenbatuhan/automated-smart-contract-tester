import Logger from '@Logger';

import type { IUser } from '@models/User';
import type { IProject } from '@models/Project';
import type { ISubmission } from '@models/Submission';
import MessageRequest from '@models/MessageRequest';
import type { IMessageRequest } from '@models/MessageRequest';

import RabbitQueueProducer from '@rabbitmq/helpers/RabbitQueueProducer';

import TestRunnerResponse from '@rabbitmq/test-runner/dto/responses/TestRunnerResponse';
import ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

import testRunnerResponseUtils from '@rabbitmq/test-runner/utils/testRunnerResponseUtils';

import messageRequestServices from '@services/messageRequestServices';
import submissionServices from '@services/submissionServices';

const { RABBITMQ_QUEUE_SUBMISSION_UPLOAD } = process.env;
if (!RABBITMQ_QUEUE_SUBMISSION_UPLOAD) throw new Error('Missing environment variables!');

const SUBMISSION_MESSAGE_LIMIT = 10;

const submissionMessageProducer = RabbitQueueProducer.create(
  RABBITMQ_QUEUE_SUBMISSION_UPLOAD, SUBMISSION_MESSAGE_LIMIT);

/**
 * Produces and sends a message to transfer the source files to the Test Runner service for test execution in the specified project.
 *
 * @param {IUser} deployer - The user initiating the submission upload.
 * @param {Buffer} zipBuffer - The zip buffer containing the source files.
 * @param {IProject} project - The project for which the submission is made.
 * @param {ISubmission} submission - The submission document.
 * @returns {Promise<IMessageRequest>} A Promise that resolves to the saved MessageRequest document.
 * @throws {AppError} If an error occurs during the submission process.
 */
const produceSubmissionMessage = async (
  deployer: IUser, zipBuffer: Buffer, project: IProject, submission: ISubmission
): Promise<IMessageRequest> => {
  Logger.info(`[${deployer?.email}] Initiating submission upload for the ${project.projectName} project to the Test Runner service for Docker image execution.`);

  const messageRequest = new MessageRequest({ deployer, channel: RABBITMQ_QUEUE_SUBMISSION_UPLOAD });
  const payload = {
    projectName: project.projectName,
    zipBuffer,
    options: { containerTimeout: project.config?.containerTimeout, execArgs: project.config?.testExecutionArguments }
  };

  const positionInTheQueue = await submissionMessageProducer.then((producer) => producer.sendToQueue(
    Buffer.from(JSON.stringify(payload)),
    async (message: string) => {
      const response = testRunnerResponseUtils.handleRabbitResponse<ContainerExecutionResponse>(
        JSON.parse(message) as TestRunnerResponse,
        {
          successMessage: `[${deployer?.email}] The submission for the ${project.projectName} project has been successfully uploaded to the Test Runner service, and the Docker image has been executed.`,
          errorMessage: `[${deployer?.email}] An error occurred while uploading the submission for the ${project.projectName} project to the Test Runner service.`
        }
      );

      // Update the submission with test runner output
      await submissionServices.updateSubmissionWithTestRunnerOutput(submission, response.data as ContainerExecutionResponse);
      await messageRequestServices.updateMessageRequest(
        messageRequest, submission._id, 'Submission', response, positionInTheQueue);
    }
  ));

  return await messageRequestServices.saveMessageRequest(messageRequest);
};

export default { produceSubmissionMessage };
