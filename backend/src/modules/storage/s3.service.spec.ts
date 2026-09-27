import { ConfigService } from '@nestjs/config';

jest.mock('mime', () => ({
  __esModule: true,
  default: { getType: jest.fn(() => null) },
}));

import { S3Service } from './s3.service';

describe('S3Service configuration', () => {
  it('throws a clear error when S3 is explicitly enabled without required config', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_DRIVER') return 's3';
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(() => new S3Service(configService)).toThrow(
      'S3 storage is enabled but AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_REGION is missing',
    );
  });
});
