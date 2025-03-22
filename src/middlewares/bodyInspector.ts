import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Middleware to inspect required fields in request body (for POST/PUT),
 * query parameters (for GET), and route parameters (for all request types).
 * @param requiredFields - An array of required field names
 */
const bodyInspector = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = {
      ...req.params, // Always include route parameters
      ...(req.method === "GET" ? req.query : req.body), // Query for GET, body for others
    };

    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(
        ", "
      )}`;
      logger.error(errorMessage);
      return res.status(400).json({ success: false, message: errorMessage });
    }

    logger.info(`Validated request data: ${JSON.stringify(data)}`);
    next();
  };
};

export default bodyInspector;
