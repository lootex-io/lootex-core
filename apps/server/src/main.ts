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
import * as fs from 'fs';
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

  // await app.listen(port);
  await app.listen(port, () => {
    const server = app.getHttpServer();
    const router = server._events.request._router;
    const availableRoutes = router.stack
      .map((layer) => {
        if (layer.route && layer.route.path) {
          return layer.route.path;
        }
      })
      .filter((route) => typeof route === 'string');

    // 去重处理
    const uniqueRoutes = [...new Set(availableRoutes)];

    // 将路由分为静态路由和变量路由
    const allowedRoutes = [];
    const variableRoutes = [];
    const variablePattern = /:\w+/;

    uniqueRoutes.forEach((route) => {
      if (variablePattern.test(route.toString())) {
        // 移除开头的斜杠（如果存在）

        // 在每个斜杠前添加反斜杠
        let convertedRegex = route.toString().replace(/\//g, '\\/');

        // 将动态参数替换为通配符
        convertedRegex = convertedRegex.replace(/:\w+/g, '[^\\/]+');

        // 在开头添加 '^'，在结尾添加 '$'
        convertedRegex = '^' + convertedRegex + '$';

        // 在整个表达式的开头和结尾添加斜杠
        variableRoutes.push(`/${convertedRegex}/`);
      } else {
        allowedRoutes.push(route);
      }
    });

    // 格式化为期望的输出格式
    const allowedRoutesText = `const allowedRoutes = [\n  ${allowedRoutes.map((route) => `"${route}"`).join(',\n  ')}\n];\n\n`;
    const variableRoutesText = `const variableRoutes = [\n  ${variableRoutes.map((route) => route).join(',\n  ')}\n];\n`;

    // 定义完整的 Worker 文件内容
    const workerContent = `/**
    * Welcome to Cloudflare Workers! This is your first worker.
    *
    * - Run "npm run dev" in your terminal to start a development server
    * - Open a browser tab at http://localhost:8787/ to see your worker in action
    * - Run "npm run deploy" to publish your worker
    *
    * Learn more at https://developers.cloudflare.com/workers/
    */

    addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request))
    })

    async function handleRequest(request) {
      const url = new URL(request.url)

      // 定义所有允许的固定路由
      ${allowedRoutesText}

      // 定义包含变量的路由的正则表达式
      ${variableRoutesText}

      // 检查请求的路径是否在允许的固定路由列表中
      if (allowedRoutes.includes(url.pathname) || variableRoutes.some(route => route.test(url.pathname))) {
        // 如果路径在允许的固定路由列表中，或匹配任一变量路由，转发请求
        return fetch(request)
      } else {
        // 如果路径不在允许的路由列表中，返回 404
        return new Response('Not Found', { status: 404 })
      }
    }
    `;

    // 将 Worker 文件内容写入到 routes.js 文件中
    fs.writeFile('scripts/routes.js', workerContent, (err) => {
      if (err) {
        console.error('Error writing Worker file:', err);
      } else {
        console.log('Worker file has been written to scripts/routes.js');
      }
    });

    // const outputText = allowedRoutesText + variableRoutesText;
    // fs.writeFile('routes.txt', outputText, (err) => {
    //   if (err) {
    //     console.error('Error writing routes to file:', err);
    //   } else {
    //     console.log('Routes have been written to routes.txt');
    //   }
    // });

    // 在使用 Thirdweb Auth 的地方，确保 webcrypto 被正确設置，如果沒有會有 "Cannot read properties of undefined (reading 'getRandomValues')"
    if (!globalThis.crypto) {
      globalThis.crypto = webcrypto as Crypto;
    }
  });
}
bootstrap();
