import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API de dominio escuchando en http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
