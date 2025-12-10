import { NestFactory } from '@nestjs/core';
import { BatchAssetOwnersModule } from '@/microservice/batch-asset-owners/batch-asset-owners.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(BatchAssetOwnersModule);
  const configService: ConfigService = app.get(ConfigService);

  app.enableShutdownHooks();

  const port = configService.get<number>('CURRENCY_PORT');
  await app.listen(port);
}

bootstrap();
