import AppError from '@errors/app-error';

export default interface ApiError {
  error?: AppError;
}
