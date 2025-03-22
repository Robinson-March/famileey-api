import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

const routeErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Global Error Handler:", err);

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    error: err.error || undefined, // Include additional error details if available
  });
};

export default routeErrorHandler;
