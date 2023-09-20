import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

/**
 * Handles a ContainerExecutionResponse and converts it into an AppError.
 *
 * @param {ContainerExecutionResponse} response - The ContainerExecutionResponse to handle.
 * @returns {AppError} An AppError representing the container error.
 */
const handleContainerError = (response: ContainerExecutionResponse): AppError => (
  AppError.createAppError(
    new Error(`${response.status} (Docker Container Exit Code = ${response.container?.statusCode})`),
    response.container?.output?.error,
    HttpStatusCode.BadGateway
  )
);

export default { handleContainerError };
