import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createInitialPosition, toFen } from '@xq/xiangqi-core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

const helmet = require('helmet') as () => (request: unknown, response: unknown, next: () => void) => void;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string>('WEB_ORIGIN', 'http://localhost:3000'), credentials: true });
  app.useGlobalFilters(app.get(ApiExceptionFilter));
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
  console.log(`API started; rules engine starting FEN: ${toFen(createInitialPosition())}`);
}

void bootstrap();
