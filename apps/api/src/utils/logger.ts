import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../index';

/**
 * Sistema de logging estructurado para producción
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  ip?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    // Log a console (con colores)
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug('\x1b[36m%s\x1b[0m', logString);
        break;
      case LogLevel.INFO:
        console.info('\x1b[32m%s\x1b[0m', logString);
        break;
      case LogLevel.WARN:
        console.warn('\x1b[33m%s\x1b[0m', logString);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error('\x1b[31m%s\x1b[0m', logString);
        break;
    }

    // Log a Redis para análisis posterior
    try {
      const key = `logs:${entry.level.toLowerCase()}:${new Date().toISOString().split('T')[0]}`;
      await redisClient.lPush(key, JSON.stringify(entry));
      await redisClient.expire(key, 86400 * 7); // Retener por 7 días
    } catch (error) {
      // No fallar si Redis no está disponible
      console.error('Failed to write log to Redis:', error);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
    });
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.FATAL,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  // Middleware para logging de requests HTTP
  httpLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const { method, path, ip } = req;
      const userId = (req as any).user?.userId;

      // Log request
      this.info('Incoming request', {
        method,
        path,
        ip,
        userId,
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        const logLevel = statusCode >= 500 ? LogLevel.ERROR : 
                         statusCode >= 400 ? LogLevel.WARN : 
                         LogLevel.INFO;

        this.writeLog({
          timestamp: new Date().toISOString(),
          level: logLevel,
          message: 'Request completed',
          context: {
            method,
            path,
            ip,
            userId,
            statusCode,
            duration,
          },
        });
      });

      next();
    };
  }

  // Middleware para logging de errores
  errorLogger() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      const { method, path, ip } = req;
      const userId = (req as any).user?.userId;

      this.error('Request error', err, {
        method,
        path,
        ip,
        userId,
      });

      next(err);
    };
  }

  // Métricas de performance
  async logMetric(metricName: string, value: number, tags?: Record<string, string>): Promise<void> {
    const key = `metrics:${metricName}`;
    const timestamp = Date.now();
    
    try {
      await redisClient.lPush(key, JSON.stringify({
        timestamp,
        value,
        tags,
      }));
      await redisClient.expire(key, 86400); // Retener por 24 horas
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  }

  // Obtener estadísticas de logs
  async getLogStats(level: LogLevel, days: number = 1): Promise<number> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days + 1);
      
      let total = 0;
      for (let i = 0; i < days; i++) {
        const key = `logs:${level.toLowerCase()}:${date.toISOString().split('T')[0]}`;
        const count = await redisClient.lLen(key);
        total += count;
        date.setDate(date.getDate() + 1);
      }
      
      return total;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return 0;
    }
  }

  // Obtener logs recientes
  async getRecentLogs(level: LogLevel, limit: number = 100): Promise<LogEntry[]> {
    try {
      const key = `logs:${level.toLowerCase()}:${new Date().toISOString().split('T')[0]}`;
      const logs = await redisClient.lRange(key, 0, limit - 1);
      return logs.map(log => JSON.parse(log));
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }
}

export const logger = new Logger();
export default logger;
