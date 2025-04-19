import type { Request, Response, NextFunction, RequestHandler } from "express";
import logger from "../utils/logger";

/**
 * Middleware to inspect required fields in request body (for POST/PUT),
 * query parameters (for GET), and route parameters (for all request types).
 * @param requiredFields - An array of required field names
 */
const bodyInspector = (requiredFields: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = {
      ...req.params,
      ...(req.method === "GET" ? req.query : req.body),
    };

    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(
        ", "
      )}`;
      logger.error(errorMessage);
      res.status(400).json({ success: false, message: errorMessage });
      return; // 👈 This fixes the return type issue
    }

    logger.info(`Validated request data: ${JSON.stringify(data)}`);
    next();
  };
};

export default bodyInspector;
