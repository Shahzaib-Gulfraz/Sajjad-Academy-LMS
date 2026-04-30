import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

type HttpRequestWithId = {
  method: string;
  originalUrl?: string;
  url: string;
  headers?: Record<string, unknown>;
  requestId?: string;
};

type HttpResponseStatus = {
  statusCode: number;
  setHeader?: (name: string, value: string) => void;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequestWithId>();
    const response = context.switchToHttp().getResponse<HttpResponseStatus>();
    const startedAt = Date.now();
    const incomingRequestId =
      request.requestId ?? request['headers']?.['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' &&
      incomingRequestId.trim().length > 0
        ? incomingRequestId.trim()
        : randomUUID();

    request.requestId = requestId;
    response.setHeader?.('x-request-id', requestId);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const route = request.originalUrl ?? request.url;
        this.logger.log(
          `${request.method} ${route} ${response.statusCode} ${durationMs}ms requestId=${request.requestId ?? 'n/a'}`,
        );
      }),
    );
  }
}
