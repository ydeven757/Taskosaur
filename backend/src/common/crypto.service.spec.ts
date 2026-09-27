import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws in production when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';

    expect(() => new CryptoService()).toThrow('ENCRYPTION_KEY is required in production');
  });
});
