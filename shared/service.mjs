import express from "express";

/**
 * Base every service shares: JSON body, a /health route, a request log
 * and one error handler. Each service only adds its own routes.
 */
export function createService(name) {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`[${name}] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get("/health", (_req, res) => res.json({ service: name, status: "ok" }));

  const listen = (port) => {
    // Errors thrown inside routes end here instead of crashing the process.
    app.use((err, _req, res, _next) => {
      console.error(`[${name}] error:`, err.message);
      res.status(err.status || 500).json({ error: err.message });
    });
    app.listen(port, () => console.log(`[${name}] escuchando en http://localhost:${port}`));
  };

  return { app, listen };
}

/** An error with an HTTP status, for the shared error handler. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Service addresses. In production these would come from config or service discovery. */
export const SERVICES = {
  gateway: `http://localhost:${process.env.GATEWAY_PORT || 4000}`,
  beers: `http://localhost:${process.env.BEERS_PORT || 4001}`,
  reviews: `http://localhost:${process.env.REVIEWS_PORT || 4002}`,
  bus: `http://localhost:${process.env.BUS_PORT || 4005}`,
};

export const portOf = (service) => Number(new URL(SERVICES[service]).port);
