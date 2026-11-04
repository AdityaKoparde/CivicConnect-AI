/** Application error type + helpers → uniform error envelope. */

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, details: unknown[] = []) =>
  new AppError(400, 'VALIDATION_ERROR', msg, details);
export const unauthenticated = (msg = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', msg);
export const forbidden = (msg = 'You do not have permission for this action') =>
  new AppError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string) => new AppError(409, 'CONFLICT', msg);
export const aiServiceError = (msg: string) =>
  new AppError(502, 'AI_SERVICE_ERROR', msg);
export const internalError = (msg = 'An unexpected error occurred') =>
  new AppError(500, 'INTERNAL_ERROR', msg);
