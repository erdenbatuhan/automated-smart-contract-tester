import type AppError from '@errors/AppError';

export default interface ApiError {
  error?: AppError;
}
