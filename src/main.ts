import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpApp = app.getHttpAdapter().getInstance();

  httpApp.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      success: true,
      message: 'Backend is running',
    });
  });

  console.log('HEALTH ROUTE LOADED');

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Serve static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('EL HANNORA API')
    .setDescription('Premium Ads Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('ads', 'Advertisement operations')
    .addTag('payments', 'Payment and subscriptions')
    .addTag('wallet', 'Wallet and coins')
    .addTag('comments', 'Comments and reactions')
    .addTag('messages', 'Messaging system')
    .addTag('negotiation-ai', 'Negotiation AI access control & usage limits')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`SERVER RUNNING ON PORT ${port}`);

  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║     🚀 EL HANNORA Backend is running!               ║
  ║                                                       ║
  ║     📡 Server: http://localhost:${port}                ║
  ║     📚 API Docs: http://localhost:${port}/api/docs     ║
  ║     🌐 Environment: ${process.env.NODE_ENV}           ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
}

bootstrap();
