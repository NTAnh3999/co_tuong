import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { packageName } from '@xq/xiangqi-core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
  console.log(`API started; rules package: ${packageName}`);
}

void bootstrap();
