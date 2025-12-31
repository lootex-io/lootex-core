import { NestFactory } from '@nestjs/core';
import { BatchOwnerAssetsModule } from '@/microservice/batch-owner-assets/batch-owner-assets.module';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '@/core/log/app-log';

async function bootstrap() {
  const app = await NestFactory.create(BatchOwnerAssetsModule, {
    bufferLogs: true,
  });
  const configService: ConfigService = app.get(ConfigService);
  app.useLogger(app.get(AppLogger));
  app.enableShutdownHooks();

  const port = configService.get<number>('CURRENCY_PORT');
  await app.listen(port);
}

bootstrap();
