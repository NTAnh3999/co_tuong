import { Controller, Get } from '@nestjs/common';
import { createInitialPosition, toFen } from '@xq/xiangqi-core';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<{
    status: 'ok';
    timestamp: string;
    coreStartingFen: string;
    db: 'ok' | 'error';
  }> {
    let db: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      coreStartingFen: toFen(createInitialPosition()),
      db,
    };
  }
}
