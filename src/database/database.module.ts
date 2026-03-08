import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE');
        if (dbType === 'mongodb') {
          return {
            type: 'mongodb',
            url: configService.get<string>('DB_URL'),
          };
        } else {
          throw new Error(`Unsupported database type: ${dbType}`);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
