import { NestFactory } from '@nestjs/core';
import { CurrencyPriceModule } from '@/microservice/currency-price/currency.price.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(CurrencyPriceModule);
  const configService: ConfigService = app.get(ConfigService);

  app.enableShutdownHooks();

  const port = configService.get<number>('CURRENCY_PORT');
  await app.listen(port);
}

bootstrap();
