import { NestFactory } from '@nestjs/core';
import { TxTrackingModule } from '@/microservice/tx-tracking/tx-tracking.module';
import { ConfigurationService } from '@/configuration';

async function bootstrap() {
  const app = await NestFactory.create(TxTrackingModule);
  const configService: ConfigurationService = app.get(ConfigurationService);
  app.enableShutdownHooks();

  const port = configService.get<number>('');
  await app.listen(port);
}

bootstrap();
