import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * get ip information from cloudflare https://developers.cloudflare.com/fundamentals/reference/http-request-headers/
 */

export const CFIp = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.headers['cf-connecting-ip'];
});

export const CFIpCountry = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.headers['cf-ipcountry'];
  },
);
