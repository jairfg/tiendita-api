import { ConsoleLogger, filterLogLevels } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { EnvironmentVariables } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const nodeEnvironment = configService.get('NODE_ENV', {
    infer: true,
  });

  const logLevel = configService.get('LOG_LEVEL', {
    infer: true,
  });

  app.useLogger(
    new ConsoleLogger({
      json: nodeEnvironment === 'production',
      colors: nodeEnvironment !== 'production',
      logLevels: filterLogLevels(`>=${logLevel}`),
    }),
  );

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(configService.get('PORT', { infer: true }));
}

await bootstrap();
