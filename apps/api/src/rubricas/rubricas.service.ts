import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QUEUE_INDEXAR_RAG, type IndexarRagJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { validarCriterios } from './rubrica.logic';
import {
  actualizarRubrica,
  asignarRubricaAActividad,
  crearRubrica,
  type RubricaFila,
} from './rubricas.repositorio';
import type { ActualizarRubrica, CrearRubrica } from './dto';

/**
 * Catálogo de rúbricas reutilizables (§5B · course builder). Solo las escrituras con
 * LÓGICA viven aquí (validación de pesos + (re)indexación RAG para Eco · §7A); el
 * listado del catálogo es CRUD directo web→Supabase (§2). Al crear/editar una rúbrica
 * se encola `indexar-rag` para que su texto alimente el RAG (fuenteTipo `rubrica`).
 */
@Injectable()
export class RubricasService {
  private readonly logger = new Logger(RubricasService.name);

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {}

  async crear(datos: CrearRubrica): Promise<RubricaFila> {
    const criterios = this.validar(datos.criterios);
    const fila = await crearRubrica(this.db.sql, { ...datos, criterios });
    await this.indexar(fila.id);
    this.logger.log(`Rúbrica creada: ${fila.id} ("${fila.nombre}", ${fila.tipo}).`);
    return fila;
  }

  async actualizar(id: string, datos: ActualizarRubrica): Promise<RubricaFila> {
    const criterios = datos.criterios ? this.validar(datos.criterios) : undefined;
    const fila = await actualizarRubrica(this.db.sql, id, { ...datos, criterios });
    if (!fila) throw new NotFoundException(`Rúbrica ${id} no existe.`);
    await this.indexar(fila.id); // re-indexa: la verdad de la rúbrica cambió.
    return fila;
  }

  /** Enlaza (o desenlaza con null) una rúbrica del catálogo a una actividad. */
  async asignar(actividadId: string, rubricaId: string | null): Promise<{ asignada: boolean }> {
    const ok = await asignarRubricaAActividad(this.db.sql, actividadId, rubricaId);
    if (!ok) throw new NotFoundException(`Actividad ${actividadId} no existe.`);
    return { asignada: rubricaId !== null };
  }

  private validar(criterios: unknown) {
    try {
      return validarCriterios(criterios);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private indexar(rubricaId: string): Promise<string> {
    const job: IndexarRagJob = { fuenteTipo: 'rubrica', fuenteId: rubricaId };
    return this.colas.encolar(QUEUE_INDEXAR_RAG, job);
  }
}
