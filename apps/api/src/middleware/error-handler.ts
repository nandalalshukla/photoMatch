/**
 * The one place where errors become HTTP responses.
 * Every response has the same shape: { error: "message", code?: "SOME_CODE" }.
 */
import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  if (error instanceof ZodError) {
    // Invalid request body / params → explain the first problem.
    const issue = error.issues[0];
    return res.status(400).json({ error: `${issue?.path.join('.') || 'input'}: ${issue?.message}` });
  }
  if (error instanceof MulterError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
};
