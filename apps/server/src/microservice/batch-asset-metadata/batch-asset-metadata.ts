import { NestFactory } from '@nestjs/core';
import { BatchAssetMetadataModule } from '@/microservice/batch-asset-metadata/batch-asset-metadata.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(BatchAssetMetadataModule);
  const configService: ConfigService = app.get(ConfigService);

  app.enableShutdownHooks();

  const port = configService.get<number>('CURRENCY_PORT');
  await app.listen(port);
}

bootstrap();
