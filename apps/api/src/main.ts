import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // `rawBody` deja disponible `req.rawBody` (buffer sin parsear) para validar la
  // firma de webhooks entrantes byte-a-byte (Zoom · §9/§10, Sprint 6).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true, rawBody: true });
  // El PDF de reportes (§6.5) recibe en el body las imágenes DICOM rasterizadas por el
  // cliente (PNG base64) → sube el límite JSON por encima del default de 100kb de Express.
  app.useBodyParser('json', { limit: '25mb' });
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API de dominio escuchando en http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
