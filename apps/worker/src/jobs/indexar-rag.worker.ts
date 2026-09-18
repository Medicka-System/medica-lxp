import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_INDEXAR_RAG, type IndexarRagJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import { aLiteralPg, embeber } from './eco/embeddings.cliente';
import { dividirEnChunks } from './eco/chunk';
import {
  borrarChunksDe,
  insertarChunk,
  leerTextoFuente,
} from './eco/indexar-rag.repositorio';

/**
 * `indexar-rag` (§8, job #10): al crear/curar un caso, rúbrica o material, indexa su
 * verdad en pgvector para el RAG de Eco. Flujo: leer texto de la fuente → trocear →
 * embeber (servicio BGE-M3 local) → upsert en `lxp.documentos_rag`. Asíncrono: la
 * latencia no importa (§8). Si el servicio de embeddings está caído, LANZA y BullMQ
 * reintenta con backoff — el índice no queda a medias (se reborra al reintentar).
 */
@Injectable()
export class IndexarRagWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_INDEXAR_RAG;

  constructor(private readonly db: DbService) {
    super();
  }

  async procesar(job: Job<IndexarRagJob>): Promise<{ chunks: number }> {
    const { fuenteTipo, fuenteId } = job.data;
    const sql = this.db.sql;

    const texto = await leerTextoFuente(sql, fuenteTipo, fuenteId);
    if (!texto) {
      this.logger.warn(`indexar-rag: fuente ${fuenteTipo}/${fuenteId} sin texto; nada que indexar.`);
      await borrarChunksDe(sql, fuenteTipo, fuenteId);
      return { chunks: 0 };
    }

    const trozos = dividirEnChunks(texto);
    const vectores = await embeber(trozos); // lanza → reintento si el servicio falla

    // Reindexar es idempotente: borra los chunks previos y reinserta.
    await borrarChunksDe(sql, fuenteTipo, fuenteId);
    for (let i = 0; i < trozos.length; i++) {
      await insertarChunk(sql, {
        fuenteTipo,
        fuenteId,
        chunk: trozos[i],
        embeddingLiteral: aLiteralPg(vectores[i]),
        metadata: { indice: i, total: trozos.length },
      });
    }

    this.logger.log(`indexar-rag: ${fuenteTipo}/${fuenteId} → ${trozos.length} chunk(s).`);
    return { chunks: trozos.length };
  }
}
