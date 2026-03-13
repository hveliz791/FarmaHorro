import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: parseInt(configService.get<string>('DB_PORT') ?? '5432', 10),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  ssl: configService.get<string>('DB_HOST')?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : configService.get<string>('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  autoLoadEntities: true,
  synchronize: true, // ⚠️ Solo en desarrollo. En prod se usan migraciones.
  logging: configService.get<string>('DB_LOGGING') === 'true',
});
