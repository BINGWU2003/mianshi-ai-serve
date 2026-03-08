import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();
    this.logger.log(`${method}-${originalUrl}-${startTime}`);
    res.on('finish', () => {
      const endTime = Date.now();
      const statusCode = res.statusCode;
      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      const duration = endTime - startTime;
      this.logger[logLevel](
        `${method}-${originalUrl}-${statusCode}-${duration}ms`,
      );
    });
    next();
  }
}
