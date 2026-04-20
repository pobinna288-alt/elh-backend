// Example configuration for app.module.ts
// Add this to your imports array

import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import storageConfig from './config/storage.config';

@Module({
  imports: [
    // ... your existing imports
    
    // Add ConfigModule for storage config
    ConfigModule.forRoot({
      load: [storageConfig],
      isGlobal: true,
    }),
    
    // Add MulterModule for file uploads
    MulterModule.register({
      dest: './uploads/temp',
      limits: {
        fileSize: 120 * 1024 * 1024, // 120MB
      },
    }),
    
    // ... rest of your modules
  ],
  // ...
})
export class AppModule {}

// Also update main.ts to serve static files:

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve uploaded files as static content
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // ... rest of your configuration
  
  await app.listen(3000);
}
bootstrap();
