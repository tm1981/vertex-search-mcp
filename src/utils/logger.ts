import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "logs");

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      dirname: logDir,
      filename: "server-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new winston.transports.Console({
      stderrLevels: ["error", "warn", "info", "debug", "verbose", "silly"],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
  ],
});
