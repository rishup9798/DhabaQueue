/**
 * Wraps an async route handler so a rejected promise is passed to Express's
 * error handling instead of crashing the process or hanging the request.
 * Usage: router.get("/", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express's catch-all error handler - must be registered last, after every
 * route. Logs the real error server-side but never leaks internals
 * (stack traces, DB error messages) to the client.
 */
export function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path}:`, err);

  // Prisma throws errors with a `code` like "P2025" (record not found).
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong. Please try again." : err.message,
  });
}

/**
 * Catches requests to routes that don't exist. Registered after all real
 * routes, before errorHandler.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}
