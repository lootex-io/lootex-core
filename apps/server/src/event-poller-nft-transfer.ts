import { NestFactory } from '@nestjs/core';
import { EventPollerNftTransferModule } from './microservice/event-poller-nft-transfer/event-poller-nft-transfer.module';
import { EventPollerNftTransferService } from './microservice/event-poller-nft-transfer/event-poller-nft-transfer.service';
import { ConfigurationService } from './configuration';
import { AppLogger } from '@/core/log/app-log';

async function bootstrap() {
    const app = await NestFactory.create(EventPollerNftTransferModule, {
        bufferLogs: true,
    });
    const configService: ConfigurationService = app.get(ConfigurationService);
    app.useLogger(app.get(AppLogger));
    app.enableShutdownHooks();

    const port = configService.get<number>('EVENT_POLLER_NFT_PORT');
    await app.listen(port);

    const eventPollerService = app.get(EventPollerNftTransferService);
    eventPollerService.setEvmPollTasks();
}

bootstrap();
