import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createInitialPosition, toFen } from '@xq/xiangqi-core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { SessionsModule } from './modules/sessions/sessions.module';
import { Module } from '@nestjs/common';

const helmet = require('helmet') as () => (request: unknown, response: unknown, next: () => void) => void;
const cookieParser = require('cookie-parser') as () => (request: unknown, response: unknown, next: () => void) => void;

// Keep the sessions module within this task's allowed paths while composing it with the existing root module.
@Module({ imports: [AppModule, SessionsModule] })
class ApiModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  app.use(helmet());
  app.use(cookieParser());
  const config = app.get(ConfigService);
  // WEB_ORIGIN may list several allowed origins separated by commas (e.g. localhost for the host
  // machine plus its LAN IP for other devices on the same network).
  const webOrigins = config
    .get<string>('WEB_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(app.get(ApiExceptionFilter));
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
  console.log(`API started; rules engine starting FEN: ${toFen(createInitialPosition())}`);
}

void bootstrap();
