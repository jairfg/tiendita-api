import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envSchema, type EnvironmentVariables } from './config/env.schema.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: envSchema,
    }),

    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => {
        const environment = configService.get('NODE_ENV', {
          infer: true,
        });

        const forwardLogs = configService.get('OBSERVE_FORWARD_LOGS', {
          infer: true,
        });

        return {
          appKey:
            configService.get('OBSERVE_APP_KEY', { infer: true }) ??
            'YOUR_APP_KEY',
          appSecret:
            configService.get('OBSERVE_APP_SECRET', { infer: true }) ??
            'YOUR_APP_SECRET',
          serviceId: 'api',
          forwardLogs: environment !== 'test' && forwardLogs,
          redaction: {
            enabled: true,
            keys: [
              'password',
              'passwordConfirmation',
              'accessToken',
              'refreshToken',
              'resetToken',
              'authorization',
              'cookie',
            ],
          },
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
