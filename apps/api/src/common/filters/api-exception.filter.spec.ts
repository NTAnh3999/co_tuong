import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  const request = { method: 'GET', originalUrl: '/api/v1/example' };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('ApiExceptionFilter', () => {
  it('formats HttpException responses as the shared API error envelope', () => {
    const { host, response } = createHost();
    new ApiExceptionFilter().catch(new NotFoundException('Missing item'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Missing item' },
    });
  });

  it('hides unhandled error details from the API response', () => {
    const { host, response } = createHost();
    new ApiExceptionFilter().catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('database password leaked');
  });
});
