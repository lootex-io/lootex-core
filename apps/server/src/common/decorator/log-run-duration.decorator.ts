import { Logger } from '@nestjs/common';

/**
 * log執行時間
 * @param operation
 * @constructor
 */
export function logRunDuration(logger?: Logger) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = new Date().getTime();
      const result = await originalMethod.apply(this, args);
      const endTime = new Date().getTime();
      const timespan = Math.round((endTime - startTime) / 1000);
      const msg = `${propertyKey} - ${JSON.stringify(
        args,
      )} logRunDuration : ${timespan} s`;
      if (logger) {
        logger.debug(msg);
      } else {
        console.log(msg);
      }
      return result;
    };
    return descriptor;
  };
}
