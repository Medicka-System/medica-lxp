import { Injectable } from '@nestjs/common';
import type {
  LLMProvider,
  RespuestaChatLLM,
  RespuestaLLM,
  SolicitudChatLLM,
  SolicitudLLM,
} from './proveedor.interface';

/**
 * Proveedor MOCK (default hasta cablear el LLM real · §7A "usa MOCK por ahora").
 * No llama a ningún modelo ni a la red: devuelve una respuesta de prueba con la
 * MISMA FORMA que espera el pipeline (JSON de juicio), para que toda la estructura
 * —config, tools, pipeline, bandeja— se pueda probar de punta a punta sin API key.
 *
 * Enchufar el modelo real = cambiar `ECO_PROVIDER`/`ANTHROPIC_API_KEY` (el factory
 * deja de elegir este). La lógica del pipeline no cambia.
 *
 * Determinista: la "nota" y la "confianza" se derivan del contenido del prompt
 * (longitud de la respuesta del alumno), así los tests son reproducibles y la
 * bandeja muestra variedad realista (unos "listos", otros "requieren criterio").
 */
@Injectable()
export class MockProvider implements LLMProvider {
  readonly nombre = 'mock';

  generar(solicitud: SolicitudLLM): Promise<RespuestaLLM> {
    // Contenido completo (prefijo cacheable + variable): así la señal determinista es la
    // misma la parta o no el pipeline en bloques para caché (no cambia el mock al cachear).
    const contenido = (solicitud.prefijoCacheable ?? '') + solicitud.prompt;
    // Señal determinista a partir del contenido (sin azar, para tests estables).
    const semilla = huella(contenido);
    const nota = 60 + (semilla % 41); // 60..100
    // Respuestas muy cortas → menor confianza (simula "requiere criterio").
    const largoRespuesta = (contenido.match(/Respuesta del alumno/i) ? 1 : 0)
      + Math.min(contenido.length, 4000);
    const confianza = Number(
      Math.min(0.98, 0.55 + ((semilla % 45) + largoRespuesta / 4000 * 40) / 100).toFixed(3),
    );

    const juicio = {
      nota_sugerida: nota,
      confianza,
      feedback_borrador:
        '[Eco · MOCK] Borrador de feedback generado sin modelo real. Reemplázalo ' +
        'configurando un proveedor con credenciales. La respuesta cubre los puntos ' +
        'principales; revisa la técnica de adquisición y la impresión diagnóstica.',
      criterios: [
        { criterio: 'Identificación de hallazgos', puntaje: nota, comentario: 'Mock.' },
        { criterio: 'Impresión diagnóstica', puntaje: Math.max(0, nota - 10), comentario: 'Mock.' },
      ],
      omisiones: nota < 75 ? ['Revisar ventana acústica', 'Documentar mediciones'] : [],
    };

    return Promise.resolve({
      texto: JSON.stringify(juicio),
      proveedor: this.nombre,
      modelo: `${solicitud.modelo} (mock)`,
      tokens: { entrada: contenido.length, salida: 0, cacheWrite: 0, cacheRead: 0 },
    });
  }

  /**
   * Chat MOCK (§7A): NO usa tools (no hay modelo que razone). Devuelve de inmediato una
   * respuesta de demostración que deja claro que Eco real llega con la key. Termina el
   * loop en la primera vuelta (`stop: 'end'`, `toolUses: []`), así el engine y la UI se
   * prueban sin credenciales.
   */
  generarChat(solicitud: SolicitudChatLLM): Promise<RespuestaChatLLM> {
    const ultimo = [...solicitud.mensajes]
      .reverse()
      .find((m) => m.role === 'user');
    const pregunta =
      ultimo?.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join(' ')
        .slice(0, 160) ?? '';
    const texto =
      `[Eco · MOCK] Recibí «${pregunta}». Sin un proveedor real cableado no consulto ` +
      `los datos del alumno (tools). Configura ECO_PROVIDER=anthropic + ANTHROPIC_API_KEY ` +
      `para que Eco responda usando las herramientas. Eco propone; usted confirma (§7A).`;
    return Promise.resolve({
      stop: 'end',
      texto,
      toolUses: [],
      contenido: [{ type: 'text', text: texto }],
      proveedor: this.nombre,
      modelo: `${solicitud.modelo} (mock)`,
      tokens: { entrada: pregunta.length, salida: texto.length, cacheWrite: 0, cacheRead: 0 },
    });
  }
}

/** Hash entero estable de una cadena (FNV-1a acotado). Sin Math.random. */
function huella(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
