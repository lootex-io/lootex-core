import { Test, TestingModule } from '@nestjs/testing';
import { EventPollerController } from './event-poller.controller';

describe('EventPollerController', () => {
  let controller: EventPollerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventPollerController],
    }).compile();

    controller = module.get<EventPollerController>(EventPollerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
