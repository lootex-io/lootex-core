import { Injectable, NestMiddleware } from '@nestjs/common';

import { ConfigurationService } from '@/configuration';

@Injectable()
export class PreviewReqInfoMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigurationService) {}
  use(req: any, res: any, next: (error?: any) => void): any {
    next();

    // if (this.configService.get<string>(NODE_ENV) === NODE_ENV_DEVELOPMENT) {
    //   const title = `Request original url: ${req.originalUrl} ${req.method} `;
    //   console.log(
    //     title,
    //     '\nRequest Headers: ',
    //     req.headers,
    //     `\nRequest body: ${JSON.stringify(req.body)}`,
    //   );
    // }
  }
}
