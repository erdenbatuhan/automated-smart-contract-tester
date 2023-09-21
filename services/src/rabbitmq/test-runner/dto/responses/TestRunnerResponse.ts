import AppError from '@errors/AppError';

export default interface TestRunnerResponse {
  statusCode: number;
  data: object | { error: AppError; };
}
