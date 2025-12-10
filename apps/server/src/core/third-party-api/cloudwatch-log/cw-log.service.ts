import { Injectable, Logger } from '@nestjs/common';
import { CLOUDWATCH_LOGS } from '@/common/utils';

@Injectable()
export class CWLogService {
  log(logger: Logger, logType: string, event: string, args: any[] = []) {
    const message = `${
      CLOUDWATCH_LOGS.CLOUDWATCH_LOGS
    } ${logType} ${event} ${args.join(' ')}`;
    logger.log(message);
  }
}
