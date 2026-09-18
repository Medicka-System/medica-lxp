import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';
import type { AteneoData, ComentarioAteneo, PostAteneo, PostTipo } from './ateneo-contrato';

/**
 * Lectura del Ateneo. Corre con RLS vía `comoAlumno`: el alumno ve los posts
 * APROBADOS + los suyos (policy posts_ateneo_select), y los comentarios de esos
 * posts (policy comentarios_ateneo_select). Los nombres de autores de otros se
 * resuelven con la función SECURITY DEFINER `lxp.nombre_de` (0011) — no se abre la
 * fila del perfil. Ver contrato para REAL vs PENDIENTE.
 */
export async function getAteneo(userId: string, nombreAlumno: string): Promise<AteneoData> {
  return comoAlumno(userId, async (sql) => {
    const posts = await sql<
      {
        id: string;
        tipo: PostTipo;
        autor: string | null;
        titulo: string;
        vineta: string | null;
        cuerpo: string | null;
        dicom_ref: string | null;
        estado: string;
        autor_id: string;
        created_at: Date;
      }[]
    >`
      select p.id, p.tipo, lxp.nombre_de(p.autor_id) as autor, p.titulo, p.vineta,
             p.cuerpo, p.dicom_ref, p.estado::text as estado, p.autor_id, p.created_at
      from lxp.posts_ateneo p
      where p.estado = 'aprobado' or p.autor_id = ${userId}
      order by p.created_at desc
      limit 40`;

    const ids = posts.map((p) => p.id);
    const comentarios = ids.length
      ? await sql<
          {
            id: string;
            post_id: string;
            autor: string | null;
            autor_id: string;
            cuerpo: string;
            upvotes: number;
            validado_por: string | null;
            created_at: Date;
          }[]
        >`
          select c.id, c.post_id, lxp.nombre_de(c.autor_id) as autor, c.autor_id, c.cuerpo,
                 c.upvotes, lxp.nombre_de(c.validado_por) as validado_por, c.created_at
          from lxp.comentarios_ateneo c
          where c.post_id = any(${ids})
          order by c.created_at asc`
      : [];

    const porPost = new Map<string, ComentarioAteneo[]>();
    for (const c of comentarios) {
      const lista = porPost.get(c.post_id) ?? [];
      lista.push({
        id: c.id,
        autor: c.autor ?? 'Colega',
        cuerpo: c.cuerpo,
        upvotes: c.upvotes,
        validadoPor: c.validado_por,
        cuando: c.created_at,
      });
      porPost.set(c.post_id, lista);
    }

    const items: PostAteneo[] = posts.map((p) => {
      const lista = porPost.get(p.id) ?? [];
      return {
        id: p.id,
        tipo: p.tipo,
        autor: p.autor ?? 'Colega',
        titulo: p.titulo,
        vineta: p.vineta,
        cuerpo: p.cuerpo,
        dicomRef: p.dicom_ref,
        esMioPendiente: p.autor_id === userId && p.estado !== 'aprobado',
        cuando: p.created_at,
        comentarios: lista,
        totalComentarios: lista.length,
      };
    });

    const misCasos = posts.filter((p) => p.autor_id === userId && p.tipo === 'caso').length;
    const misAportes = comentarios.filter((c) => c.autor_id === userId).length;

    return {
      yo: {
        nombre: nombreAlumno,
        ini: iniciales(nombreAlumno),
        casos: misCasos,
        aportes: misAportes,
      },
      posts: items,
    };
  });
}
