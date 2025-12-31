import { NestFactory } from '@nestjs/core';
import { EventPollerModule } from './microservice/event-poller/event-poller.module';
import { EventPollerService } from './microservice/event-poller/event-poller.service';
import { ConfigurationService } from './configuration';
import { AppLogger } from '@/core/log/app-log';

async function bootstrap() {
  const app = await NestFactory.create(EventPollerModule, { bufferLogs: true });
  const configService: ConfigurationService = app.get(ConfigurationService);
  app.useLogger(app.get(AppLogger));
  app.enableShutdownHooks();

  const port = configService.get<number>('EVENT_POLLER_PORT');
  await app.listen(port);

  const eventPollerService = app.get(EventPollerService);
  eventPollerService.setEvmPollTasks();
}

bootstrap();
