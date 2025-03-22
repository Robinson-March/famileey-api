import winston from "winston";

const logger = winston.createLogger({
  level: "info", // Default log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      // Logs all levels to console
      format: winston.format.combine(
        winston.format.colorize(), // Adds color to console logs
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "logs/server.log", level: "info" }), // Logs all info-level and above messages to a file
    new winston.transports.File({ filename: "logs/error.log", level: "error" }), // Logs errors separately
  ],
});

export default logger;
