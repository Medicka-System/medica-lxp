import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // `rawBody` deja disponible `req.rawBody` (buffer sin parsear) para validar la
  // firma de webhooks entrantes byte-a-byte (Zoom · §9/§10, Sprint 6).
  const app = await NestFactory.create(AppModule, { cors: true, rawBody: true });
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API de dominio escuchando en http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
