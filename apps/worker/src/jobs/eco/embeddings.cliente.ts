/**
 * Cliente del servicio de embeddings self-hosted (BGE-M3 · §3) para el worker.
 * Es un glue de infra mínimo (como `db.service`): el worker no comparte código con
 * el `api`, así que replica este pequeño cliente HTTP. Convierte texto → vector
 * 1024d para el upsert en pgvector (`indexar-rag`).
 */

/** Dimensión de BGE-M3 (debe cuadrar con `vector(1024)` de `documentos_rag`). */
export const EMBEDDINGS_DIM = 1024;

function base(): string {
  return process.env.EMBEDDINGS_URL ?? 'http://localhost:8001';
}

/** Embebe varios textos; un vector por texto, en orden. Lanza si el servicio falla
 * (BullMQ reintenta el job · §8). */
export async function embeber(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const res = await fetch(`${base()}/embed`, {
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
  const data = (await res.json()) as { embeddings: number[][] };
  if (!Array.isArray(data.embeddings) || data.embeddings.length !== textos.length) {
    throw new Error('Respuesta de embeddings malformada (conteo no coincide).');
  }
  return data.embeddings;
}

/** Literal que entiende pgvector: `[a,b,c]`. */
export function aLiteralPg(v: number[]): string {
  return `[${v.join(',')}]`;
}
