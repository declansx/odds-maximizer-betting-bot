// src/utils/logger.js - Logging utility for the application
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Default logger for general application logs
 */
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'sx-bet-bot' },
  transports: [
    // Write all logs to the file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
  ],
});

/**
 * Creates a position-specific logger instance
 * @param {string} positionId - Unique identifier for the position
 * @returns {winston.Logger} - Logger instance for the position
 */
export function createPositionLogger(positionId) {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: 'sx-bet-bot', positionId },
    transports: [
      // Write position logs to dedicated file
      new winston.transports.File({
        filename: path.join(logsDir, `position_${positionId}.log`),
      }),
    ],
  });
}

/**
 * Console logger with no file output for CLI interactions
 * This prevents logging user interactions to files
 */
export const cliLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => {
      return `${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});