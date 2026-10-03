import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RateLimitGuard } from './common/rate-limit.guard';

/** Orígenes permitidos para CORS (§10): la web del campus. NUNCA `*` con credenciales. */
function corsOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrap(): Promise<void> {
  // `rawBody` deja disponible `req.rawBody` (buffer sin parsear) para validar la
  // firma de webhooks entrantes byte-a-byte (Zoom · §9/§10, Sprint 6).
  // CORS RESTRINGIDO (antes `cors: true` reflejaba CUALQUIER origen · §10): solo los
  // orígenes conocidos del campus, con credenciales. Los webhooks server-a-server no
  // llevan Origin → no los afecta CORS.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false, rawBody: true });
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });
  // Rate-limit por IP (§10/§11): writes más estrictos que reads; `/health` exento.
  // In-memory por proceso (backstop de memoria incluido) → para multi-instancia, respaldar
  // con Redis (ioredis ya es dep). Ver common/rate-limit.guard.ts.
  app.useGlobalGuards(new RateLimitGuard());
  // El PDF de reportes (§6.5) recibe en el body las imágenes DICOM rasterizadas por el
  // cliente (PNG base64) → sube el límite JSON por encima del default de 100kb de Express.
  app.useBodyParser('json', { limit: '25mb' });
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API de dominio escuchando en http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
