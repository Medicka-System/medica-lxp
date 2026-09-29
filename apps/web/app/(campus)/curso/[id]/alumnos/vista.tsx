'use client';

/**
 * Curso · ALUMNOS — integrantes del grupo. Los COMPAÑEROS son reales (definer
 * `roster_grupo_alumno()`: nombre + avatar). El roster de STAFF, la sede/especialidad, la
 * presencia y la última conexión NO están disponibles para el alumno → no se listan. Cada
 * fila: avatar, nombre, rol y menú (Enviar mensaje → Consultas · Ver perfil → Ateneo).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MessageSquare, Search, Users } from 'lucide-react';
import type { Integrante, RolGrupo } from '../_components/curso';
import { Avatar, BotonSec, CabeceraPagina, Chip, Segmentado, card, focusRing, mono, th } from '../_components/curso';

const COLS = 'grid grid-cols-[minmax(0,1fr)_200px_160px_150px] items-center';
const ROL: Record<RolGrupo, { etiqueta: string; tono: 'neutro' | 'navy' | 'info' }> = {
  alumno: { etiqueta: 'Alumno', tono: 'neutro' },
  tutor: { etiqueta: 'Tutor · docente', tono: 'navy' },
  coordinacion: { etiqueta: 'Coordinación académica', tono: 'info' },
  'control-escolar': { etiqueta: 'Control escolar', tono: 'info' },
};

function Fila({ p, abierta, onAbrir, onCerrar }: { p: Integrante; abierta: boolean; onAbrir: () => void; onCerrar: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const staff = p.rol !== 'alumno';

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onCerrar();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('mousedown', fuera);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', fuera);
      window.removeEventListener('keydown', esc);
    };
  }, [abierta, onCerrar]);

  return (
    <div ref={ref} className={`relative ${COLS} border-t border-border ${abierta ? 'bg-accent' : 'hover:bg-muted'}`}>
      <span className="flex min-w-0 items-center gap-3 px-[18px] py-3">
        <span className="relative shrink-0">
          <Avatar ini={p.ini} url={p.avatarUrl} size={38} staff={staff} />
          {p.enLinea && <span aria-label="en línea" className="absolute -bottom-px -right-px h-[11px] w-[11px] rounded-full border-2 border-card bg-primary" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-bold">{p.nombre}</span>
          {p.detalle && <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{p.detalle}</span>}
        </span>
      </span>
      <span className="px-[18px] py-3">
        <Chip tono={ROL[p.rol].tono}>{ROL[p.rol].etiqueta}</Chip>
      </span>
      <span className={`px-[18px] py-3 text-[12px] ${p.enLinea ? 'font-semibold text-secondary' : 'text-muted-foreground'}`}>{p.ultima || '—'}</span>
      <span className="px-[18px] py-3 text-right">
        <button
          type="button"
          onClick={abierta ? onCerrar : onAbrir}
          aria-haspopup="menu"
          aria-expanded={abierta}
          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing} ${abierta ? 'border-primary' : 'border-border'}`}
        >
          <MessageSquare aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Mensaje
        </button>
      </span>

      {abierta && (
        <div role="menu" className="absolute right-[18px] top-[calc(100%-6px)] z-20 w-[230px] rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(17,24,39,0.16)]">
          {[
            { icono: MessageSquare, t: 'Enviar mensaje', s: 'abre Consultas', go: `/consultas?nueva=${p.id}` },
            { icono: Users, t: 'Ver su perfil', s: 'en el Ateneo', go: `/ateneo/perfil/${p.id}` },
          ].map(({ icono: I, t, s, go }) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              onClick={() => router.push(go)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent ${focusRing}`}
            >
              <I aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
              <span>
                <span className="block text-[12.5px] font-semibold">{t}</span>
                <span className="block text-[10.5px] text-muted-foreground">{s}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AlumnosVista({
  cursoId,
  contexto,
  grupoNombre,
  integrantes,
}: {
  cursoId: string;
  contexto: string;
  grupoNombre: string | null;
  integrantes: Integrante[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'alumnos' | 'staff'>('todos');
  const [menu, setMenu] = useState<string | null>(null);

  const f = useMemo(() => {
    const t = q.trim().toLowerCase();
    return integrantes.filter((p) => !t || p.nombre.toLowerCase().includes(t) || p.detalle.toLowerCase().includes(t));
  }, [integrantes, q]);
  const staff = f.filter((p) => p.rol !== 'alumno');
  const alumnos = f.filter((p) => p.rol === 'alumno');
  const nStaff = integrantes.filter((p) => p.rol !== 'alumno').length;

  const Grupo = ({ titulo, lista, teal }: { titulo: string; lista: Integrante[]; teal?: boolean }) =>
    lista.length ? (
      <>
        <p className={`border-t border-border bg-card px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${teal ? 'text-secondary' : 'text-muted-foreground'}`}>{titulo}</p>
        {lista.map((p) => (
          <Fila key={p.id} p={p} abierta={menu === p.id} onAbrir={() => setMenu(p.id)} onCerrar={() => setMenu(null)} />
        ))}
      </>
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Alumnos del grupo"
        contexto={contexto}
        sub={`${grupoNombre ? `${grupoNombre} · ` : ''}${integrantes.length - nStaff} ${integrantes.length - nStaff === 1 ? 'compañero' : 'compañeros'} de grupo.`}
        acciones={
          <BotonSec icono={<Mail aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => router.push(`/consultas?nueva=grupo-${cursoId}`)}>
            Mensaje a todo el grupo
          </BotonSec>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[300px] items-center gap-2 rounded-[10px] border border-border bg-card px-3 focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
        </label>
        <Segmentado
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { id: 'todos', etiqueta: 'Todos', n: integrantes.length },
            { id: 'alumnos', etiqueta: 'Alumnos', n: integrantes.length - nStaff },
            { id: 'staff', etiqueta: 'Staff', n: nStaff },
          ]}
        />
      </div>

      {integrantes.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center text-[13px] text-muted-foreground`}>Aún no hay compañeros de grupo que mostrar.</div>
      ) : (
        <section className={`${card} overflow-visible`}>
          <div className={`${COLS} rounded-t-xl bg-muted`}>
            {['Nombre', 'Rol', 'Última conexión', ''].map((t) => (
              <span key={t || 'acc'} className={`px-[18px] py-[11px] ${th}`}>
                {t}
              </span>
            ))}
          </div>
          {filtro !== 'alumnos' && <Grupo titulo="Su equipo" lista={staff} teal />}
          {filtro !== 'staff' && <Grupo titulo={`Compañeros · ${alumnos.length}`} lista={alumnos} />}
          {!f.length && <p className="border-t border-border px-6 py-10 text-center text-[13px] text-muted-foreground">Nadie coincide con “{q}”.</p>}
        </section>
      )}
      <p className={`${mono} text-[11px] text-muted-foreground`}>los datos de inscripción vienen de CORA · solo lectura</p>
    </div>
  );
}
