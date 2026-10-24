import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { runWithRequestContext } from '../request-context';

interface HttpRequest {
  header(name: string): string | undefined;
  method: string;
  originalUrl: string;
}

interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  once(event: 'finish', listener: () => void): this;
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Http');

  use(request: HttpRequest, response: HttpResponse, next: () => void): void {
    const inboundRequestId = request.header('x-request-id');
    const requestId = inboundRequestId || randomUUID();
    const startedAt = performance.now();

    response.setHeader('x-request-id', requestId);
    response.once('finish', () => {
      this.logger.log(JSON.stringify({
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      }));
    });

    runWithRequestContext({ requestId }, next);
  }
}
