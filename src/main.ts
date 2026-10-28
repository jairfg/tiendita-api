import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { EnvironmentVariables } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  configureApp(app);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  await app.listen(configService.get('PORT', { infer: true }));
}

await bootstrap();
