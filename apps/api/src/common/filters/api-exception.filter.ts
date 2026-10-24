import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@xq/shared-contracts';
import { getRequestId } from '../request-context';

interface HttpRequest {
  method: string;
  originalUrl: string;
}

interface HttpResponse {
  setHeader(name: string, value: string): void;
  status(code: number): this;
  json(body: unknown): void;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const requestId = getRequestId();

    if (requestId) response.setHeader('x-request-id', requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ApiError = {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const responseObject = typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse as Record<string, unknown>
        : undefined;
      const rawMessage = responseObject?.message ?? exceptionResponse;
      const message = Array.isArray(rawMessage)
        ? rawMessage.map(String).join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : exception.message;
      const details = responseObject?.details;
      const code = HttpStatus[status] ?? 'HTTP_ERROR';

      payload = {
        error: {
          code,
          message,
          ...(details === undefined ? {} : { details }),
        },
      };
    } else {
      this.logger.error(JSON.stringify({
        requestId,
        method: request.method,
        path: request.originalUrl,
        error: exception instanceof Error
          ? { name: exception.name, message: exception.message, stack: exception.stack }
          : String(exception),
      }));
    }

    response.status(status).json(payload);
  }
}
