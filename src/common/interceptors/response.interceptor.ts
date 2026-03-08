import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';
export interface ResponseFormat<T> {
  data: T;
  message: string;
  statusCode: number;
  timestamp: Date;
}
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const response: Response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data: T) => ({
        data,
        message: 'success',
        statusCode: response.statusCode,
        timestamp: new Date(),
      })),
    );
  }
}
