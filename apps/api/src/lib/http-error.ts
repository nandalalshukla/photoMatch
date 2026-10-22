/**
 * An error with an HTTP status code.
 *
 * Throw it anywhere in a route or service (`throw new HttpError(404, 'Event not found')`)
 * and the global error handler turns it into a JSON response. Express 5
 * forwards errors from async handlers automatically, so no try/catch is needed.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
