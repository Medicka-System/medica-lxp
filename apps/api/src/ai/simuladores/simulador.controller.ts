import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SimuladorService } from './simulador.service';
import type {
  ResultadoSesion,
  SeccionReporte,
} from './simulador.tipos';

interface InterpretacionBody {
  alumnoId?: string;
  casoId?: string;
  hallazgos?: string;
  impresion?: string;
  seguridad?: string;
}
interface ReporteBody {
  alumnoId?: string;
  casoId?: string;
  secciones?: SeccionReporte[];
}

/**
 * API de los simuladores IA (§7A · Sprint 7). Es DOMINIO (juicio de Eco), no proxy
 * de CRUD (§2): evalúa la respuesta del alumno contra la verdad del caso, registra la
 * sesión, emite xAPI y agenda repaso. El CATÁLOGO y el historial los lee `web` directo
 * de Supabase bajo RLS (Regla de Oro) — no pasan por aquí.
 *
 * `alumnoId` viaja hoy en el cuerpo (mismo patrón que Eco/validación · Sprint 5); en
 * el Sprint 9 saldrá del JWT verificado.
 */
@Controller('ai/simulador')
export class SimuladorController {
  constructor(private readonly simulador: SimuladorService) {}

  /** Sesión de interpretación: hallazgos + impresión → feedback contra la verdad. */
  @Post('interpretacion')
  @HttpCode(200)
  interpretacion(@Body() body: InterpretacionBody): Promise<ResultadoSesion> {
    if (!body?.alumnoId) throw new BadRequestException('alumnoId es requerido');
    if (!body?.casoId) throw new BadRequestException('casoId es requerido');
    if (!body?.hallazgos?.trim() && !body?.impresion?.trim()) {
      throw new BadRequestException('Escribe al menos hallazgos o una impresión.');
    }
    return this.simulador.evaluarInterpretacion(body.alumnoId, body.casoId, {
      hallazgos: body.hallazgos ?? '',
      impresion: body.impresion ?? '',
      seguridad: body.seguridad,
    });
  }

  /** Sesión de reporte: secciones redactadas → revisión de estructura/omisiones. */
  @Post('reporte')
  @HttpCode(200)
  reporte(@Body() body: ReporteBody): Promise<ResultadoSesion> {
    if (!body?.alumnoId) throw new BadRequestException('alumnoId es requerido');
    if (!body?.casoId) throw new BadRequestException('casoId es requerido');
    const secciones = (body.secciones ?? []).filter(
      (s) => s && typeof s.titulo === 'string' && typeof s.texto === 'string',
    );
    if (secciones.length === 0 || secciones.every((s) => !s.texto.trim())) {
      throw new BadRequestException('Redacta al menos una sección del reporte.');
    }
    return this.simulador.evaluarReporte(body.alumnoId, body.casoId, { secciones });
  }
}
