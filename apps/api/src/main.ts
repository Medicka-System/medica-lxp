import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
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
  // H5P core/editor cliente (§5C/§7 · P2): el editor/player piden sus assets en
  // `/h5p/core/*` y `/h5p/editor/*`. El H5PAjaxEndpoint NO los sirve (solo ajax/libraries/
  // contenido), así que los servimos estáticos desde el volumen, donde la siembra
  // (H5pService.onModuleInit) deja h5p-php-library / h5p-editor-php-library. `mkdir` para
  // que el static exista aunque la siembra aún no haya corrido (sirve 404 hasta que lleguen).
  const h5pData = process.env.H5P_DATA_DIR || join(process.cwd(), '.h5p-data');
  for (const sub of ['core', 'editor']) mkdirSync(join(h5pData, sub), { recursive: true });
  app.useStaticAssets(join(h5pData, 'core'), { prefix: '/h5p/core' });
  app.useStaticAssets(join(h5pData, 'editor'), { prefix: '/h5p/editor' });
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API de dominio escuchando en http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
