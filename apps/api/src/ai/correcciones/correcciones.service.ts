import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../../db/db.service';
import {
  cargarPropuesta,
  marcarPropuesta,
} from '../pipeline/propuestas.repositorio';
import { asentarEntrega, registrarCorreccion } from './correcciones.repositorio';

/** Decisión humana sobre una propuesta de Eco. */
export interface ConfirmacionPropuesta {
  /** Nota final del docente (si omite, toma la sugerida por Eco). */
  nota?: number | null;
  /** Feedback final (si omite, toma el borrador de Eco). */
  feedback?: string | null;
}

export interface ResultadoConfirmacion {
  propuestaId: string;
  objetoTipo: 'entrega' | 'caso';
  objetoId: string;
  notaAsentada: number | null;
  correccionId: string;
  /** true si el docente cambió algo respecto a la sugerencia de Eco. */
  hubocorreccion: boolean;
}

/**
 * Cierre humano de una propuesta de Eco (§7A: "Eco propone; el humano decide.
 * Nada se asienta sin él"). Confirmar asienta la nota (entregas) y SIEMPRE registra
 * la corrección docente→Eco (aunque el docente acepte tal cual: acuerdo también es
 * señal). Para casos, el asentado clínico es la validación del docente (flujo
 * aparte); aquí se cierra la propuesta y se captura la corrección.
 */
@Injectable()
export class CorreccionesService {
  private readonly logger = new Logger(CorreccionesService.name);

  constructor(private readonly db: DbService) {}

  async confirmar(
    propuestaId: string,
    docenteId: string,
    decision: ConfirmacionPropuesta,
  ): Promise<ResultadoConfirmacion> {
    const prop = await cargarPropuesta(this.db.sql, propuestaId);
    if (!prop) throw new NotFoundException(`Propuesta ${propuestaId} no existe.`);
    if (prop.estado !== 'propuesta') {
      throw new ConflictException(
        `Propuesta ${propuestaId} ya fue ${prop.estado}; no se puede confirmar de nuevo.`,
      );
    }

    const notaFinal = decision.nota !== undefined ? decision.nota : prop.nota_sugerida;
    const feedbackFinal =
      decision.feedback !== undefined ? decision.feedback : prop.feedback_borrador;
    const hubocorreccion =
      notaFinal !== prop.nota_sugerida || feedbackFinal !== prop.feedback_borrador;

    // Asienta la nota SOLO para entregas (el caso se asienta por validación clínica).
    if (prop.objeto_tipo === 'entrega') {
      await asentarEntrega(this.db.sql, {
        entregaId: prop.objeto_id,
        nota: notaFinal,
        feedback: feedbackFinal,
      });
    }

    // Loop de mejora: qué propuso Eco vs qué dejó el humano.
    const { correccionId } = await registrarCorreccion(this.db.sql, {
      docenteId,
      objetoTipo: prop.objeto_tipo,
      objetoId: prop.objeto_id,
      sugerenciaEco: {
        nota: prop.nota_sugerida,
        feedback: prop.feedback_borrador,
        detalle: prop.detalle,
      },
      correccion: { nota: notaFinal, feedback: feedbackFinal, hubocorreccion },
    });

    await marcarPropuesta(this.db.sql, propuestaId, 'confirmada');
    this.logger.log(
      `Propuesta ${propuestaId} confirmada por ${docenteId} (corrección: ${hubocorreccion}).`,
    );

    return {
      propuestaId,
      objetoTipo: prop.objeto_tipo,
      objetoId: prop.objeto_id,
      notaAsentada: prop.objeto_tipo === 'entrega' ? notaFinal : null,
      correccionId,
      hubocorreccion,
    };
  }

  /** Descarta una propuesta sin asentar nada (el docente la ignora). */
  async descartar(propuestaId: string, docenteId: string): Promise<void> {
    const prop = await cargarPropuesta(this.db.sql, propuestaId);
    if (!prop) throw new NotFoundException(`Propuesta ${propuestaId} no existe.`);
    await marcarPropuesta(this.db.sql, propuestaId, 'descartada');
    this.logger.log(`Propuesta ${propuestaId} descartada por ${docenteId}.`);
  }
}
