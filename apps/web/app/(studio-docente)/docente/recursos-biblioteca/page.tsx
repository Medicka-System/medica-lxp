import { requireDocente } from '../../_lib/session';
import { getRecursos } from '@/lib/studio/datos';
import { ContenidoBiblioteca } from '@/app/(studio)/studio/contenido/_components/contenido-biblioteca';

export const dynamic = 'force-dynamic';

/**
 * Docente · RECURSOS (§5B) = biblioteca de contenido reutilizable. REUSA el
 * `ContenidoBiblioteca` del Studio (no reconstruye). El docente CONSULTA/usa los recursos
 * (RLS: lectura authenticated); SUBIR es del diseñador → `soloLectura` oculta esa acción.
 * `rutaBase` deja el detalle bajo el shell del docente. Distinto de "Mis recursos"
 * (almacén personal del docente).
 */
export default async function DocenteRecursosBibliotecaPage() {
  const { userId } = await requireDocente();
  const { recursos, pendienteDb } = await getRecursos(userId);
  return (
    <ContenidoBiblioteca
      recursos={recursos}
      pendienteDb={pendienteDb}
      rutaBase="/docente/recursos-biblioteca"
      soloLectura
    />
  );
}
