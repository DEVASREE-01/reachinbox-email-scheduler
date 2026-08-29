import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

/**
 * Middleware that secures endpoints by verifying the presence of an active session.
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return next(new UnauthorizedError('Authentication required'));
}
