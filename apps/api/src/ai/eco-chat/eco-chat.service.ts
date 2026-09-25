import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { EcoConfigService } from '../config/eco-config.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { ProveedorFactory } from '../proveedores/proveedor.factory';
import { EcoTelemetriaService } from '../costo/eco-telemetria.service';
import type {
  BloqueContenido,
  HerramientaLLM,
  MensajeChat,
} from '../proveedores/proveedor.interface';
import { obtenerTool, toolsParaRol } from './tools/registry';
import type { CtxTool, FuenteCitada, RolLxp, SurfaceEco } from './tools/tipos';

/** Un turno de la conversación tal como llega del cliente (transitorio, sin persistir). */
export interface TurnoChat {
  rol: 'usuario' | 'eco';
  texto: string;
}

export interface PeticionChat {
  surface: SurfaceEco;
  entidadId: string;
  /** Quién pregunta (staff). Hoy viaja en el body; en Sprint 11 saldrá del JWT (como todo /ai). */
  usuarioId: string;
  mensajes: TurnoChat[];
}

export interface RespuestaChat {
  texto: string;
  fuentes: FuenteCitada[];
  toolsUsados: string[];
  modelo: string;
}

/**
 * Eco CONVERSACIONAL (§7A). Orquesta el loop de TOOL-USE nativo: el modelo pide
 * herramientas (datos del alumno vía SQL bajo RLS, o conocimiento vía RAG), el engine
 * las ejecuta y le devuelve el resultado, hasta la respuesta final. Stateless: el
 * historial llega en cada request (no se persiste); solo la telemetría de costo se guarda.
 *
 * Regla de oro de Eco (§7A): el LLM solo razona/redacta; TODO dato viene de una tool
 * (SQL/RAG), nunca inventado. READ-ONLY en esta fase — Eco informa, no acciona.
 *
 * Doble candado (§10): el rol del usuario se resuelve de `lxp.perfiles`, se ofrecen solo
 * las tools permitidas para ese rol, y CADA tool corre impersonando al usuario
 * (`DbService.comoUsuario`) para que la RLS filtre por fila.
 */
@Injectable()
export class EcoChatService {
  private readonly logger = new Logger(EcoChatService.name);
  /** Tope de vueltas del loop (backstop contra un modelo que encadene tools sin parar). */
  private static readonly MAX_VUELTAS = 6;

  constructor(
    private readonly db: DbService,
    private readonly config: EcoConfigService,
    private readonly embeddings: EmbeddingsService,
    private readonly proveedores: ProveedorFactory,
    private readonly telemetria: EcoTelemetriaService,
  ) {}

  async responder(p: PeticionChat): Promise<RespuestaChat> {
    if (!p.mensajes?.length) {
      return { texto: 'No recibí ninguna pregunta.', fuentes: [], toolsUsados: [], modelo: 'n/a' };
    }

    const cfg = await this.config.activa();
    const rol = await this.resolverRol(p.usuarioId);
    if (!rol) {
      return {
        texto: 'No pude identificar tu rol en el LXP; el chat de Eco requiere una sesión de staff.',
        fuentes: [],
        toolsUsados: [],
        modelo: 'n/a',
      };
    }

    // Modelo del chat (config, no hardcode): `modelos.chat` con fallback a `juicio` (§7A).
    const refModelo = cfg.modelos.chat ?? cfg.modelos.juicio;
    const proveedor = this.proveedores.obtener(refModelo.proveedor);
    if (!proveedor.generarChat) {
      return {
        texto:
          'El proveedor de Eco configurado no soporta conversación con herramientas. ' +
          'Configura ECO_PROVIDER=anthropic + ANTHROPIC_API_KEY (§3/§7A).',
        fuentes: [],
        toolsUsados: [],
        modelo: proveedor.nombre,
      };
    }

    const toolsDisponibles = toolsParaRol(rol, p.surface);
    const specs: HerramientaLLM[] = toolsDisponibles.map((t) => ({
      nombre: t.nombre,
      descripcion: t.descripcion,
      schema: t.schema,
    }));

    const system = this.construirSystem(cfg.systemPromptChat, p, rol);
    const mensajes: MensajeChat[] = p.mensajes.map((m) => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: [{ type: 'text', text: m.texto }],
    }));

    const fuentes: FuenteCitada[] = [];
    const toolsUsados: string[] = [];
    let modeloUsado = refModelo.modelo;
    let textoFinal = '';

    for (let vuelta = 0; vuelta < EcoChatService.MAX_VUELTAS; vuelta++) {
      const resp = await proveedor.generarChat({
        system,
        tools: specs,
        mensajes,
        modelo: refModelo.modelo,
        temperatura: cfg.temperatura,
        maxTokens: cfg.maxTokens,
      });
      modeloUsado = resp.modelo;

      // Telemetría de costo por CADA llamada del loop (§7A · reusa lxp.eco_uso).
      await this.telemetria.registrar({
        modelo: resp.modelo,
        paso: 'chat',
        objetoTipo: p.surface,
        objetoId: p.entidadId,
        tokens: resp.tokens,
      });

      if (resp.stop !== 'tool_use' || resp.toolUses.length === 0) {
        textoFinal = resp.texto;
        break;
      }

      // Re-anexa el turno del asistente (con sus tool_use) tal cual, y ejecuta las tools.
      mensajes.push({ role: 'assistant', content: resp.contenido });
      const resultados: BloqueContenido[] = [];
      for (const uso of resp.toolUses) {
        toolsUsados.push(uso.nombre);
        const salida = await this.ejecutarTool(uso, rol, p);
        if (salida.fuentes) fuentes.push(...salida.fuentes);
        resultados.push({
          type: 'tool_result',
          tool_use_id: uso.id,
          content: salida.contenido,
          ...(salida.esError ? { is_error: true } : {}),
        });
      }
      mensajes.push({ role: 'user', content: resultados });

      if (vuelta === EcoChatService.MAX_VUELTAS - 1) {
        // Se agotó el presupuesto de vueltas sin respuesta final: pide el cierre en texto.
        this.logger.warn(
          `Eco chat alcanzó MAX_VUELTAS (${EcoChatService.MAX_VUELTAS}) para ${p.surface}/${p.entidadId}.`,
        );
        textoFinal =
          resp.texto ||
          'Reuní varios datos pero no alcancé a cerrar la respuesta. Reformula la pregunta, por favor.';
      }
    }

    return {
      texto: textoFinal || 'No obtuve una respuesta del modelo.',
      fuentes: dedupFuentes(fuentes),
      toolsUsados,
      modelo: modeloUsado,
    };
  }

  /**
   * Ejecuta UNA tool con doble candado: valida el rol contra `rolesPermitidos` y corre la
   * tool impersonando al usuario (RLS). Un fallo de la tool NO rompe la conversación:
   * vuelve como `tool_result` de error para que el modelo lo maneje.
   */
  private async ejecutarTool(
    uso: { id: string; nombre: string; input: unknown },
    rol: RolLxp,
    p: PeticionChat,
  ): Promise<{ contenido: string; fuentes?: FuenteCitada[]; esError?: boolean }> {
    const def = obtenerTool(uso.nombre);
    if (!def) {
      return { contenido: `Herramienta desconocida: ${uso.nombre}.`, esError: true };
    }
    if (!def.rolesPermitidos.includes(rol)) {
      // Candado de rol (§10): además de que ni se ofreció, se rechaza al ejecutar.
      return { contenido: `Tu rol (${rol}) no puede usar «${uso.nombre}».`, esError: true };
    }
    const input = (uso.input && typeof uso.input === 'object' ? uso.input : {}) as Record<
      string,
      unknown
    >;
    try {
      return await this.db.comoUsuario(p.usuarioId, async (sql) => {
        const ctx: CtxTool = {
          sql,
          usuarioId: p.usuarioId,
          rol,
          surface: p.surface,
          entidadId: p.entidadId,
        };
        return def.ejecutar(ctx, input, { embeddings: this.embeddings });
      });
    } catch (e) {
      this.logger.warn(`Tool ${uso.nombre} falló: ${(e as Error).message}`);
      return { contenido: `La herramienta «${uso.nombre}» falló al ejecutarse.`, esError: true };
    }
  }

  /** Rol de plataforma LXP del usuario que pregunta (de `lxp.perfiles`). `null` si no tiene. */
  private async resolverRol(usuarioId: string): Promise<RolLxp | null> {
    const rows = await this.db.sql<{ rol: RolLxp }[]>`
      select rol::text as rol from lxp.perfiles where user_id = ${usuarioId} limit 1`;
    return rows[0]?.rol ?? null;
  }

  /** System prompt del chat + el encuadre de la surface (a quién analiza y con qué rol). */
  private construirSystem(promptChat: string | undefined, p: PeticionChat, rol: RolLxp): string {
    const base = promptChat ?? SYSTEM_CHAT_FALLBACK;
    const contexto =
      `\n\nCONTEXTO DE ESTA CONVERSACIÓN:\n` +
      `- Superficie: expediente del alumno.\n` +
      `- Alumno en foco (id): ${p.entidadId}. Las herramientas ya apuntan a ESTE alumno.\n` +
      `- Rol de quien pregunta: ${rol}.`;
    return base + contexto;
  }
}

/** Fallback del system prompt si la config aún no trae `system_prompt_chat` (previa a 0045). */
const SYSTEM_CHAT_FALLBACK =
  'Eres Eco, analista conversacional del campus de ultrasonido. NO inventes datos: cualquier ' +
  'cifra o hecho sobre el alumno DEBE venir de una herramienta. Eres read-only (informas, no ' +
  'accionas). Eco propone; el humano decide (§7A). Responde en español, breve y preciso.';

/** Quita fuentes repetidas (mismo tipo+id) para no inflar la lista de la UI. */
function dedupFuentes(fuentes: FuenteCitada[]): FuenteCitada[] {
  const vistas = new Set<string>();
  const out: FuenteCitada[] = [];
  for (const f of fuentes) {
    const clave = `${f.tipo}:${f.id ?? ''}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    out.push(f);
  }
  return out;
}
