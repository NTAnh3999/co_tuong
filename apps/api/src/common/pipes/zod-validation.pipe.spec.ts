import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(2) });
  const pipe = new ZodValidationPipe(schema);

  it('throws a 400 with Zod issues when the value is invalid', () => {
    try {
      pipe.transform({ name: 'x' });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        response: {
          message: 'Validation failed',
          details: [expect.objectContaining({ path: ['name'], code: 'too_small' })],
        },
      });
    }
  });

  it('returns the parsed value unchanged when it is valid', () => {
    const value = { name: 'red' };
    expect(pipe.transform(value)).toEqual(value);
  });
});
