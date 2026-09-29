'use client';

/**
 * Studio · Staff — vista operativa del equipo (§5B). Quién es staff, qué rol tiene
 * y CÓMO VA SU CARGA (grupos, cola, validaciones) — todo REAL vía RLS. El alta y el
 * cambio de rol viven en Configuración → Usuarios y roles (frontera; placeholder aquí).
 *
 * Color (§5A): ÁMBAR es el único color de atención (sobrecarga), con su motivo escrito.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Lock, Plus, Search, Sparkles } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import { Avatar } from '@/components/avatar';
import { ChipRol } from './rol-chip';
import type { StaffData } from './contrato';

type Filtro = 'todos' | 'docente' | 'disenador_instruccional' | 'admin';

const TRACKS = '1.7fr 150px 1.3fr 1.4fr 150px';

export function StaffLista({ data }: { data: StaffData }) {
  const { totales, staff } = data;
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return staff.filter((s) => {
      const porRol =
        filtro === 'todos' ||
        (filtro === 'admin' ? s.rol === 'admin' || s.rol === 'super_admin' : s.rol === filtro);
      return porRol && (!q || s.nombre.toLowerCase().includes(q) || s.area.toLowerCase().includes(q));
    });
  }, [staff, filtro, busca]);

  const tarjetas: [string, string, string, boolean][] = [
    ['Staff activo', String(totales.total), `${totales.conteos.docentes} docentes · ${totales.conteos.disenadores} diseñadores · ${totales.conteos.admins} admins`, false],
    ['Con sobrecarga', String(totales.conSobrecarga), `docentes con ${8}+ casos en cola`, true],
    ['Validaciones esta semana', String(totales.validadosSemana), 'casos validados por el equipo', false],
    ['Respuesta media', totales.respuestaMedia ?? '—', 'de consulta del alumno a respuesta del docente', false],
  ];

  const tabs: [Filtro, string, number][] = [
    ['todos', 'Todos', totales.conteos.todos],
    ['docente', 'Docentes', totales.conteos.docentes],
    ['disenador_instruccional', 'Diseñadores', totales.conteos.disenadores],
    ['admin', 'Admins', totales.conteos.admins],
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Staff</h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta y roles: Configuración
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Quién es staff, qué rol tiene y cómo va su carga. Vista operativa; el alta y el cambio de rol se hacen en Configuración.
          </p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            disabled
            title="Eco analista — próximamente (por API)"
            className={`inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] opacity-70 ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
          <button
            type="button"
            disabled
            title="Invitar / alta de usuario se hace en Configuración → Usuarios y roles"
            className={`inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-muted-foreground ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Invitar
            <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(([t, v, s, warn]) => (
          <li
            key={t}
            className={`rounded-xl border p-4 shadow-rest ${
              warn ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-card'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
              {t}
            </p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>{v}</p>
            <p className={`mt-1.5 text-[11px] leading-snug ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>{s}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre o área</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre o área…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {tabs.map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtro === id ? 'text-white/70' : 'text-muted-foreground'}`}>{n}</span>
            </button>
          ))}
        </div>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {staff.length}
        </span>
      </div>

      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <div className="grid items-center gap-3.5 bg-muted px-[18px] py-2.5" style={{ gridTemplateColumns: TRACKS }}>
          {['Persona', 'Rol', 'A su cargo', 'Actividad reciente', 'En la escuela desde'].map((t) => (
            <span key={t} className="min-w-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>

        {visibles.map((s) => (
          <Link
            key={s.id}
            href={`/admin/staff/${s.id}`}
            className={`grid items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${focusRing} ${
              s.senal ? 'bg-[color:var(--warning-surface)]/40' : ''
            }`}
            style={{ gridTemplateColumns: TRACKS }}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar ini={s.ini} url={s.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-snug">{s.nombre}</span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">{s.area}</span>
              </span>
            </span>

            <span className="min-w-0">
              <ChipRol rol={s.rol} />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold">{s.cargo}</span>
              {s.senal && (
                <span className="mt-0.5 block text-[10.5px] font-semibold text-[color:var(--warning-foreground)]">{s.senal}</span>
              )}
            </span>

            <span className={`min-w-0 truncate text-[12px] ${softText}`}>{s.actividad}</span>

            <span className={`${mono} whitespace-nowrap text-[11px] text-muted-foreground`}>{s.desde}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
