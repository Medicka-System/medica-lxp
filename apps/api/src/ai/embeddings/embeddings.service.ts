import { Injectable, Logger } from '@nestjs/common';

/**
 * Cliente del servicio de embeddings self-hosted (BGE-M3 · §3). Vive en
 * `services/embeddings/` (Python), fuera de este proceso: NO usamos una API de
 * embeddings de terceros (latencia · §3). Aquí solo hablamos HTTP con él.
 *
 * Es un TOOL determinista del pipeline (§7A "datos y recuperación = tool, no LLM"):
 * convierte texto → vector 1024d para indexar/recuperar en pgvector.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  /** Dimensión de BGE-M3; debe cuadrar con `vector(1024)` de `documentos_rag`. */
  static readonly DIM = 1024;

  private base(): string {
    return process.env.EMBEDDINGS_URL ?? 'http://localhost:8001';
  }

  /** Embebe varios textos de una. Devuelve un vector por texto, en orden. */
  async embeber(textos: string[]): Promise<number[][]> {
    if (textos.length === 0) return [];
    const res = await fetch(`${this.base()}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ textos }),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(
        `Servicio de embeddings respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as { embeddings: number[][]; dim?: number };
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== textos.length) {
      throw new Error('Respuesta de embeddings malformada (conteo no coincide).');
    }
    return data.embeddings;
  }

  /** Embebe un solo texto (atajo para consultas de recuperación). */
  async embeberUno(texto: string): Promise<number[]> {
    const [v] = await this.embeber([texto]);
    return v;
  }

  /** Formatea un vector JS al literal que entiende pgvector: `[a,b,c]`. */
  static aLiteralPg(v: number[]): string {
    return `[${v.join(',')}]`;
  }
}
