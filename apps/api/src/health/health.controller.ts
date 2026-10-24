import { Controller, Get } from '@nestjs/common';
import { createInitialPosition, toFen } from '@xq/xiangqi-core';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok'; timestamp: string; coreStartingFen: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      coreStartingFen: toFen(createInitialPosition()),
    };
  }
}
