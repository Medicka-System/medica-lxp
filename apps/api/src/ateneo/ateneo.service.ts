import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  actividad,
  actorDeUsuario,
  emitirStatement,
  verbo,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { XapiService } from '../xapi/xapi.service';
import {
  cargarCasoPublicable,
  cargarComentario,
  cargarPost,
  fijarSelloComentario,
  moderarPost,
  publicarPostDeCaso,
  type ModeracionDecision,
} from './ateneo.repositorio';

export interface ResultadoSello {
  comentarioId: string;
  postId: string;
  sellado: boolean;
}

export interface ResultadoModeracion {
  postId: string;
  decision: ModeracionDecision;
}

export interface ResultadoPublicacion {
  postId: string;
  casoId: string;
  /** `true` si se creó el post ahora; `false` si ya existía (idempotencia). */
  creado: boolean;
}

/**
 * Dominio del Ateneo (§5B/§6/§7 · Sprint 5). NO es proxy de CRUD (§2): cada acción
 * dispara una side-effect que solo puede vivir en `api` — el SELLO DE AUTORIDAD del
 * docente y la publicación de un caso validado emiten xAPI (capa Sprint 2). El feed,
 * los comentarios y los upvotes simples van directo `web → Supabase` con RLS.
 */
@Injectable()
export class AteneoService {
  private readonly logger = new Logger(AteneoService.name);

  constructor(
    private readonly db: DbService,
    private readonly xapi: XapiService,
  ) {}

  /**
   * El docente pone (o retira) su SELLO clínico sobre un comentario de interconsulta
   * (§5B). Al sellar, emite xAPI `validó` sobre el caso del post. Retirar el sello no
   * emite (no es una validación).
   */
  async sellarComentario(
    comentarioId: string,
    docenteId: string,
    sellar = true,
  ): Promise<ResultadoSello> {
    const comentario = await cargarComentario(this.db.sql, comentarioId);
    if (!comentario) throw new NotFoundException(`Comentario ${comentarioId} no existe.`);

    await fijarSelloComentario(this.db.sql, comentarioId, sellar ? docenteId : null);

    if (sellar) {
      await this.xapi.encolar(
        emitirStatement(
          actorDeUsuario(docenteId),
          verbo('valido'),
          actividad('caso', comentario.post_id),
          { success: true },
        ),
      );
      this.logger.log(`Comentario ${comentarioId} sellado por ${docenteId}.`);
    }
    return { comentarioId, postId: comentario.post_id, sellado: sellar };
  }

  /**
   * El docente MODERA un post del Ateneo (aprobar/rechazar) — el sello de autoridad
   * a nivel de post. Emite xAPI `validó` (success según la decisión).
   */
  async moderar(
    postId: string,
    docenteId: string,
    decision: ModeracionDecision,
  ): Promise<ResultadoModeracion> {
    const post = await cargarPost(this.db.sql, postId);
    if (!post) throw new NotFoundException(`Post ${postId} no existe.`);

    await moderarPost(this.db.sql, postId, decision);

    await this.xapi.encolar(
      emitirStatement(
        actorDeUsuario(docenteId),
        verbo('valido'),
        actividad('caso', postId),
        { success: decision === 'aprobado' },
      ),
    );
    this.logger.log(`Post ${postId} moderado (${decision}) por ${docenteId}.`);
    return { postId, decision };
  }

  /**
   * Publica un caso VALIDADO de la bitácora al feed del Ateneo (§5B, DoD Sprint 5).
   * Es más que un insert: exige que el caso esté `aprobado` y ANONIMIZADO (§10 — nunca
   * al feed con PII), es idempotente (un caso ⇒ a lo sumo un post) y emite xAPI `subió`
   * solo cuando se crea el post. El autor del post es el alumno dueño del caso.
   */
  async publicarCaso(casoId: string): Promise<ResultadoPublicacion> {
    const caso = await cargarCasoPublicable(this.db.sql, casoId);
    if (!caso) throw new NotFoundException(`Caso ${casoId} no existe.`);

    if (caso.estado_validacion !== 'aprobado') {
      throw new ConflictException(
        'Solo un caso aprobado por el docente puede publicarse en el Ateneo.',
      );
    }
    // §10: sin traza de anonimización + referencia del estudio, no va al feed.
    if (!caso.estudio_dicom_ref || !caso.anonimizado_en) {
      throw new ConflictException(
        'El estudio del caso no está anonimizado; no puede publicarse en el Ateneo.',
      );
    }

    const titulo = caso.diagnostico_presuntivo || caso.organo || 'Caso clínico';
    const vineta = caso.hallazgos ?? null;
    const { postId, creado } = await publicarPostDeCaso(
      this.db.sql,
      caso,
      titulo,
      vineta,
    );

    if (creado) {
      // xAPI: el alumno SUBIÓ su caso al Ateneo (comunidad). Solo al crearse.
      await this.xapi.encolar(
        emitirStatement(
          actorDeUsuario(caso.id_alumno),
          verbo('subio'),
          actividad('caso', casoId),
          { completion: true },
        ),
      );
      this.logger.log(`Caso ${casoId} publicado en el Ateneo (post ${postId}).`);
    }
    return { postId, casoId, creado };
  }
}
