import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({
      path: req.path,
      method: req.method,
      code: err.code,
      message: err.message,
      errors: err.errors,
    }, 'Operational error');

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Unhandled internal errors
  logger.error({
    path: req.path,
    method: req.method,
    err,
  }, 'Unhandled exception occurred');

  const showDetails = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  return res.status(500).json({
    success: false,
    message: showDetails ? err.message : 'An internal server error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    ...(showDetails ? { stack: err.stack } : {}),
  });
}
