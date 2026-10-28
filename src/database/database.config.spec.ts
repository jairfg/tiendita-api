import {
  createCliDatabaseOptions,
  createNestDatabaseOptions,
} from './database.config.js';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy.js';

describe('database configuration', () => {
  const databaseUrl =
    'postgresql://tiendita:tiendita_dev@localhost:5435/tiendita_development';

  it('creates safe options for the Nest application', () => {
    const options = createNestDatabaseOptions(databaseUrl);

    expect(options).toMatchObject({
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
      autoLoadEntities: true,
      retryAttempts: 5,
      retryDelay: 1_000,
    });

    expect(options.namingStrategy).toBeInstanceOf(SnakeCaseNamingStrategy);
    expect(options.entities).toBeUndefined();
  });

  it('creates CLI options with entity and migration paths', () => {
    const options = createCliDatabaseOptions(databaseUrl);

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.namingStrategy).toBeInstanceOf(SnakeCaseNamingStrategy);

    expect(options.entities).toEqual([
      expect.stringContaining('*.entity.{ts,js}'),
    ]);

    expect(options.migrations).toEqual([expect.stringContaining('*.{ts,js}')]);
  });
});
