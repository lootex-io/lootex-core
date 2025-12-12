import { LoggerErrorInterceptor } from 'nestjs-pino';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppLogger } from '@/core/log/app-log';
import * as fs from 'fs'; // fs might not be used now, but 'express' imports are needed. Use separate lines.
import { urlencoded, json } from 'express';
import { webcrypto } from 'node:crypto';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService: ConfigService = app.get(ConfigService);

  // const corsOriginRegExp =
  //   configService.get('NODE_ENV') === 'production'
  //     ? // (https://) (subdomain.)? lootex.(dev|io) or https://biru-demo.vercel.app or https://biru.gg or https://testnet.biru.gg
  //       /^((https:\/\/[^.]*\.?)?lootex\.(dev|io))|(https:\/\/biru-demo\.vercel\.app)|(https:\/\/biru\.gg)|(https:\/\/testnet\.biru\.gg)$/
  //     : // Development environment: includes localhost, vercel.app, and lootex domains
  //       /^(((https:\/\/)|(http:\/\/))(([^.]*)\.lootex|lootex)\.(io|dev))|(https:\/\/[^.]*\.vercel\.app)|(http:\/\/localhost(:\d+)?)$/;
  // const corsConfig = {
  //   // @dev Allow localhost origin on dev environments
  //   origin: function (origin, callback) {
  //     const isProduction = configService.get('NODE_ENV') === 'production';
  //     if (
  //       (!isProduction &&
  //         [
  //           'http://localhost:3000',
  //           'http://localhost:3001',
  //           'https://local.lootex.dev',
  //           'https://localhost.lootex.dev',
  //         ].includes(origin)) ||
  //       !origin
  //     ) {
  //       callback(null, true);
  //     } else {
  //       if (corsOriginRegExp.test(origin)) {
  //         callback(null, true);
  //       } else {
  //         callback(
  //           new Error(`[LOOTEX:CORS] NOT ALLOWED FOR ORIGIN: ${origin}`),
  //         );
  //       }
  //     }
  //   },
  //   // origin: '*',
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   maxAge: 86400, // 24小時，單位為秒
  //   preflightContinue: false, // 確保預檢請求在此處結束
  //   optionsSuccessStatus: 204, // 預檢請求的回應狀態碼
  // };
  // app.enableCors(corsConfig);

  // 启用 CORS，允许所有来源请求
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-KEY',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Client-Id',
    ],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  app.useLogger(app.get(AppLogger));

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser(configService.get('AUTH_COOKIE_SECRET')));
  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], // 保留現有的默認源設定
          // ... 其他現有指令
          imgSrc: [
            "'self'",
            'data:',
            'ads-twitter.com',
            'ads-api.twitter.com',
            'analytics.twitter.com',
          ],
          connectSrc: [
            "'self'",
            'ads-twitter.com',
            'ads-api.twitter.com',
            'analytics.twitter.com',
          ],
        },
      },
    }),
  );

  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lootex Backend V3')
      .setDescription('Lootex Backend API description')
      .setVersion('3.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/doc', app, document, {
      explorer: true,
    });
  }
  app.set('trust proxy', 1);

  const { httpAdapter } = app.get(HttpAdapterHost);
  // app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  const port = configService.get<number>('PORT');

  // 在使用 Thirdweb Auth 的地方，確保 webcrypto 被正确設置
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as Crypto;
  }

  await app.listen(port);
}
bootstrap();
