import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/**
 * Proxy DELGADO a la API de Giphy (§3 · GIFs del Ateneo). La API key vive SOLO en el `api`
 * (GIPHY_API_KEY, env) — nunca en el cliente. Devuelve lo mínimo que necesita el picker:
 * id, url del gif animado (hotlink al CDN de Giphy · su ToS exige hotlink, no re-hospedar),
 * preview estático y dimensiones. `rating=pg-13` acota el contenido.
 */

export type GifItem = { id: string; url: string; preview: string; width: number; height: number };

// Forma parcial de la respuesta de Giphy (solo lo que consumimos).
type GiphyImg = { url?: string; width?: string; height?: string };
type GiphyItem = {
  id?: string;
  images?: { fixed_width?: GiphyImg; downsized?: GiphyImg; fixed_width_still?: GiphyImg };
};

function mapGif(it: GiphyItem): GifItem | null {
  const img = it.images?.fixed_width ?? it.images?.downsized;
  if (!it.id || !img?.url) return null;
  const still = it.images?.fixed_width_still;
  return {
    id: String(it.id),
    url: img.url,
    preview: still?.url ?? img.url,
    width: Number(img.width) || 200,
    height: Number(img.height) || 200,
  };
}

@Injectable()
export class GifsService {
  private readonly key = process.env.GIPHY_API_KEY ?? '';
  private readonly base = 'https://api.giphy.com/v1/gifs';

  trending(limite = 24): Promise<{ gifs: GifItem[] }> {
    const u = `${this.base}/trending?api_key=${this.key}&limit=${limite}&rating=pg-13&bundle=messaging_non_clips`;
    return this.consultar(u);
  }

  buscar(q: string, limite = 24): Promise<{ gifs: GifItem[] }> {
    const term = (q ?? '').trim();
    if (!term) return this.trending(limite);
    const u = `${this.base}/search?api_key=${this.key}&q=${encodeURIComponent(term)}&limit=${limite}&rating=pg-13&lang=es&bundle=messaging_non_clips`;
    return this.consultar(u);
  }

  private async consultar(url: string): Promise<{ gifs: GifItem[] }> {
    if (!this.key) throw new ServiceUnavailableException('GIPHY_API_KEY no configurada en el api.');
    let resp: Response;
    try {
      resp = await fetch(url, { cache: 'no-store' } as RequestInit);
    } catch {
      throw new ServiceUnavailableException('No se pudo contactar Giphy.');
    }
    if (!resp.ok) throw new ServiceUnavailableException(`Giphy respondió ${resp.status}.`);
    const data = (await resp.json()) as { data?: GiphyItem[] };
    const gifs = (data.data ?? []).map(mapGif).filter((g): g is GifItem => g !== null);
    return { gifs };
  }
}
