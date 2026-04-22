"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5500',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3000;
    await app.listen(port);
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
//# sourceMappingURL=main.js.map