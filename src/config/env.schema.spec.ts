import { envSchema } from './env.schema.js';

const validEnvironment = {
  DATABASE_URL:
    'postgresql://tiendita:tiendita_dev@localhost:5435/tiendita_development',
  REDIS_URL: 'redis://localhost:6380',
};

describe('envSchema', () => {
  it('applies defaults and converts the port to a number', () => {
    const environment = envSchema.parse(validEnvironment);

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe(3000);
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
