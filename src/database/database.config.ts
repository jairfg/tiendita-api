import { join } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy.js';

function createBaseDatabaseOptions(databaseUrl: string) {
  return {
    type: 'postgres',
    url: databaseUrl,
    applicationName: 'tiendita-api',
    poolSize: 10,

    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'all',

    isolateWhereStatements: true,
    invalidWhereValuesBehavior: {
      null: 'throw',
      undefined: 'throw',
    },

    namingStrategy: new SnakeCaseNamingStrategy(),
  } satisfies DataSourceOptions;
}

export function createNestDatabaseOptions(
  databaseUrl: string,
): TypeOrmModuleOptions {
  return {
    ...createBaseDatabaseOptions(databaseUrl),
    autoLoadEntities: true,
    retryAttempts: 5,
    retryDelay: 1_000,
  };
}

export function createCliDatabaseOptions(
  databaseUrl: string,
): DataSourceOptions {
  return {
    ...createBaseDatabaseOptions(databaseUrl),
    entities: [join(import.meta.dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
  };
}
