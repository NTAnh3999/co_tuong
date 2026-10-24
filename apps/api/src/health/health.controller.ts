import { Controller, Get } from '@nestjs/common';
import { packageName } from '@xq/xiangqi-core';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok'; timestamp: string; core: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      core: packageName,
    };
  }
}
