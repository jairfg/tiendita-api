import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const corsOriginSchema = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith('http://') || value.startsWith('https://'),
    {
      message: 'must use the http:// or https:// protocol',
    },
  );

const corsOriginsSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(corsOriginSchema).min(1));

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

    CORS_ORIGINS: corsOriginsSchema,

    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith('postgresql://'), {
        message: 'must use the postgresql:// protocol',
      }),

    REDIS_URL: z
      .string()
      .url()
      .refine(
        (value) =>
          value.startsWith('redis://') || value.startsWith('rediss://'),
        {
          message: 'must use the redis:// or rediss:// protocol',
        },
      ),

    OBSERVE_APP_KEY: optionalNonEmptyString,
    OBSERVE_APP_SECRET: optionalNonEmptyString,
  })
  .superRefine((environment, context) => {
    const hasObserveKey = Boolean(environment.OBSERVE_APP_KEY);
    const hasObserveSecret = Boolean(environment.OBSERVE_APP_SECRET);

    if (hasObserveKey !== hasObserveSecret) {
      context.addIssue({
        code: 'custom',
        path: ['OBSERVE_APP_KEY'],
        message: 'OBSERVE_APP_KEY and OBSERVE_APP_SECRET must be set together',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      (!hasObserveKey || !hasObserveSecret)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['OBSERVE_APP_KEY'],
        message: 'Observe credentials are required in production',
      });
    }
  });

export type EnvironmentVariables = z.infer<typeof envSchema>;
