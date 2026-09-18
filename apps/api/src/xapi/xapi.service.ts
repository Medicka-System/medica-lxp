import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  OPCIONES_REINTENTO_XAPI,
  XAPI_BASE_IRI,
  XAPI_VERSION,
  actorDeUsuario,
  type EnvioXapiJob,
  type Statement,
} from '@campus/shared';

/** Token de inyección de la cola productora (permite mockearla en tests). */
export const XAPI_QUEUE = 'XAPI_QUEUE';

export interface ConsultaStatements {
  agent?: string; // user_id de Supabase
  verb?: string; // IRI del verbo
  activity?: string; // IRI de la actividad
  limit?: number;
}

/**
 * Productor de xAPI (§2/§7): encola statements hacia `envio-xapi` (nunca escribe
 * al LRS de forma síncrona) y expone la LECTURA del LRS para competencia/analítica.
 * No es proxy de CRUD: es orquestación de integración (permitido en `api` · §2).
 */
@Injectable()
export class XapiService implements OnModuleDestroy {
  private readonly logger = new Logger(XapiService.name);

  constructor(@Inject(XAPI_QUEUE) private readonly queue: Queue<EnvioXapiJob>) {}

  /** Encola un statement con reintentos/backoff. Devuelve el id del job. */
  async encolar(statement: Statement): Promise<string> {
    const job = await this.queue.add(
      'statement',
      { statement },
      OPCIONES_REINTENTO_XAPI,
    );
    this.logger.log(`Statement ${statement.id} encolado (job ${job.id}).`);
    return job.id ?? '';
  }

  /** Consulta el LRS (lectura para el motor de competencia/analítica · §7). */
  async consultarStatements(params: ConsultaStatements): Promise<unknown> {
    const endpoint = process.env.LRS_ENDPOINT ?? 'http://localhost:8080/xapi';
    const auth = Buffer.from(
      `${process.env.LRS_KEY ?? ''}:${process.env.LRS_SECRET ?? ''}`,
    ).toString('base64');

    const url = new URL(`${endpoint}/statements`);
    if (params.agent) {
      // El filtro `agent` de xAPI espera un Agent JSON (se filtra por su IFI).
      url.searchParams.set('agent', JSON.stringify(actorDeUsuario(params.agent)));
    }
    if (params.verb) url.searchParams.set('verb', params.verb);
    if (params.activity) url.searchParams.set('activity', params.activity);
    if (params.limit) url.searchParams.set('limit', String(params.limit));

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'X-Experience-API-Version': XAPI_VERSION,
          Authorization: `Basic ${auth}`,
        },
      });
    } catch (err) {
      // LRS caído: la LECTURA sí es síncrona (no hay cola de lectura), así que
      // reportamos 503 en vez de tragarnos el error (§5).
      throw new ServiceUnavailableException(
        `No se pudo contactar al LRS (${XAPI_BASE_IRI}): ${(err as Error).message}`,
      );
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `El LRS respondió ${res.status} ${res.statusText}.`,
      );
    }
    return res.json();
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
