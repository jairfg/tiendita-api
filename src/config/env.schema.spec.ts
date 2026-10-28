import { envSchema } from './env.schema.js';

const validEnvironment = {
  DATABASE_URL:
    'postgresql://tiendita:tiendita_dev@localhost:5435/tiendita_development',
  REDIS_URL: 'redis://localhost:6380',
  CORS_ORIGINS: 'http://localhost:5173',
};

describe('envSchema', () => {
  it('applies defaults and converts the port to a number', () => {
    const environment = envSchema.parse(validEnvironment);

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe(3000);
    expect(environment.LOG_LEVEL).toBe('log');
    expect(environment.OBSERVE_FORWARD_LOGS).toBe(false);
  });

  it('converts the Observe log forwarding flag to a boolean', () => {
    const environment = envSchema.parse({
      ...validEnvironment,
      OBSERVE_FORWARD_LOGS: 'true',
    });

    expect(environment.OBSERVE_FORWARD_LOGS).toBe(true);
  });

  it('rejects an invalid port', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      PORT: 'invalid',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['PORT'],
          }),
        ]),
      );
    }
  });

  it('rejects an invalid log level', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      LOG_LEVEL: 'info',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['LOG_LEVEL'],
          }),
        ]),
      );
    }
  });

  it('rejects a database URL with the wrong protocol', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      DATABASE_URL: 'mysql://localhost/tiendita',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['DATABASE_URL'],
          }),
        ]),
      );
    }
  });

  it('converts comma-separated CORS origins into an array', () => {
    const environment = envSchema.parse({
      ...validEnvironment,
      CORS_ORIGINS: 'http://localhost:5173, https://admin.tiendita.com',
    });

    expect(environment.CORS_ORIGINS).toEqual([
      'http://localhost:5173',
      'https://admin.tiendita.com',
    ]);
  });

  it('rejects an invalid CORS origin', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      CORS_ORIGINS: 'http://localhost:5173, ftp://files.tiendita.com',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('CORS_ORIGINS');
    }
  });

  it('requires both Observe credentials when either one is present', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      OBSERVE_APP_KEY: 'app-key',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['OBSERVE_APP_KEY'],
          }),
        ]),
      );
    }
  });

  it('requires Observe credentials in production', () => {
    const result = envSchema.safeParse({
      ...validEnvironment,
      NODE_ENV: 'production',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['OBSERVE_APP_KEY'],
          }),
        ]),
      );
    }
  });

  it('accepts a valid production environment', () => {
    const environment = envSchema.parse({
      ...validEnvironment,
      NODE_ENV: 'production',
      OBSERVE_APP_KEY: 'app-key',
      OBSERVE_APP_SECRET: 'app-secret',
    });

    expect(environment.NODE_ENV).toBe('production');
    expect(environment.OBSERVE_APP_KEY).toBe('app-key');
    expect(environment.OBSERVE_APP_SECRET).toBe('app-secret');
  });
});
