'use client';

/**
 * Monta el course builder COMPLETO (`EditorDeLeccion`, reusado del Studio de Programas)
 * sobre una lección PROPIA del grupo. El mismo editor de los 7 tipos (teoría con bloques,
 * video/h5p/xapi/autoeval/tarea/foro) — las server actions derivan `grupo_id` de la lección,
 * así que lo que se autora aquí afecta SOLO a este grupo (nunca al programa ni a otros grupos).
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import { EditorDeLeccion } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/editores-leccion';
import type { LeccionGrupoEditor } from '@/lib/studio/datos';

export function EditorLeccionGrupo({ data }: { data: LeccionGrupoEditor }) {
  const router = useRouter();
  const [, start] = useTransition();
  // Mismo contrato `correr` que el builder: transición + refresh tras persistir.
  const correr = (accion: () => Promise<void>) =>
    start(async () => {
      await accion();
      router.refresh();
    });

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-12 pt-7">
      <Link
        href={`/studio/grupos/${data.grupoId}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Volver al grupo
      </Link>

      <div className="mt-4">
        <p className={`${kicker} text-secondary`}>Contenido propio del grupo · {data.grupoNombre}</p>
        <h1 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{data.titulo}</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Lo que construyas aquí es exclusivo de este grupo: no toca el programa ni a otros grupos.
        </p>
      </div>

      <div className="mt-6">
        <EditorDeLeccion
          programaId={data.programaId}
          leccionId={data.leccionId}
          tipo={data.tipo}
          titulo={data.titulo}
          config={data.config}
          bloques={data.bloques}
          correr={correr}
        />
      </div>
    </div>
  );
}
