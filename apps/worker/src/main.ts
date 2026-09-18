import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Worker NestJS standalone: SIN servidor HTTP (§2). Es un proceso Node persistente
 * que hospeda los consumidores de BullMQ. En el Sprint 0 solo registra la cola
 * `envio-xapi` (vacía) y verifica la conexión a Redis.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  Logger.log('Worker LXP iniciado (sin HTTP). Escuchando colas BullMQ.', 'Bootstrap');
}

void bootstrap();
