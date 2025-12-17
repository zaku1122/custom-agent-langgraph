import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000', // Next.js default port
    credentials: true,
    //origin: true,
  });


  app.useGlobalPipes(new ValidationPipe()); 
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`📡 Chat endpoint: http://localhost:${port}/chat`);
  console.log(`🌊 Stream endpoint: http://localhost:${port}/chat/stream`);
  console.log(`📄 PDF endpoint: http://localhost:${port}/pdf`);
  console.log(`📎 Documents endpoint: http://localhost:${port}/documents`);
}
bootstrap();
