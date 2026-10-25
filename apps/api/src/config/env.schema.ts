import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  // One or more allowed browser origins, comma-separated (e.g. localhost plus a LAN IP so both
  // the host machine and other devices on the same network can reach the API).
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .refine(
      (value) => value.split(',').every((origin) => z.string().url().safeParse(origin.trim()).success),
      { message: 'must be a comma-separated list of valid URLs' },
    ),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
