import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppLogger implements LoggerService {
  // constructor(@Inject(PARAMS_PROVIDER_TOKEN) params: Params) {}
  constructor(private readonly logger: PinoLogger) {}

  error(msg: string, ...args) {
    this.logger.error(msg, ...args);
  }

  debug(msg: string, ...args) {
    this.logger.debug(`${args} ` + msg, ...args);
  }
  info(msg: string, ...args) {
    this.logger.info(msg, ...args);
  }
  warn(msg: string, ...args) {
    this.logger.warn(msg, ...args);
  }

  log(message: any, ...optionalParams: any[]): any {
    if (
      optionalParams &&
      (optionalParams.includes('RouterExplorer') ||
        optionalParams.includes('RoutesResolver'))
    ) {
      return;
    }
    this.logger.info(`${optionalParams} ` + message, optionalParams);
  }

  setLogLevels(levels: LogLevel[]): any {}

  verbose(message: any, ...optionalParams: any[]): any {
    this.logger.info(`${optionalParams} ` + message, optionalParams);
  }
}
