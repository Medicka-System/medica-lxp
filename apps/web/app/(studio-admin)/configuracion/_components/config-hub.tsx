'use client';

/**
 * Studio · Configuración del sistema — hub de gobierno (exclusivo del SÚPER ADMIN, §5B).
 *
 * Sigue el mock aprobado (`campus-lxp-mocks/studio/admin/configuracion`): las nueve
 * áreas NO son un menú plano, sino tres grupos por lo que gobiernan
 *   · Personas y acceso        → usuarios y roles, seguridad y auditoría, notificaciones
 *   · Inteligencia y conexiones → IA/Eco, integraciones, almacenamiento y LRS
 *   · Academia y marca          → académico global, badges, marca y apariencia
 *
 * Diferencia con el mock: aquí NO se inventan métricas. Solo **IA / Eco** tiene
 * pantalla real hoy (edita `lxp.eco_config`), así que su tarjeta navega y muestra su
 * dato vivo; las demás enseñan su acceso/estructura marcadas «Próximamente» (se
 * construyen en sus sprints). Sin avisos ni log fabricados.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BellRing,
  ChevronRight,
  Database,
  Lock,
  Palette,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';

/* ───────────────────────────── Tipos ───────────────────────────── */

export type ResumenEco = {
  nombre: string;
  modeloJuicio: string;
  umbralConfianza: number;
  version: number;
};

type IconoArea =
  | 'usuarios'
  | 'eco'
  | 'integraciones'
  | 'academico'
  | 'marca'
  | 'almacenamiento'
  | 'notificaciones'
  | 'seguridad'
  | 'badges';

type Area = {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  dentro: string[];
  icono: IconoArea;
  /** Ruta real; si falta, la tarjeta es estructura (no navega). */
  href?: string;
};

type Grupo = { rotulo: string; nota: string; areas: Area[] };

const ICONOS: Record<IconoArea, typeof Users> = {
  usuarios: Users,
  eco: Sparkles,
  integraciones: Plug,
  academico: Award,
  marca: Palette,
  almacenamiento: Database,
  notificaciones: BellRing,
  seguridad: ShieldCheck,
  badges: Award,
};

/* ── Las nueve áreas, agrupadas (copy del mock aprobado). Solo IA/Eco navega. ── */
const GRUPOS: Grupo[] = [
  {
    rotulo: 'Personas y acceso',
    nota: 'quién entra y qué puede hacer',
    areas: [
      {
        id: 'usuarios',
        numero: '01',
        titulo: 'Usuarios y roles',
        descripcion:
          'Alta de staff y asignación de roles: súper admin, admin, docente y diseñador, con sus permisos.',
        dentro: ['Usuarios', 'Roles', 'Permisos por sección'],
        icono: 'usuarios',
      },
      {
        id: 'seguridad',
        numero: '08',
        titulo: 'Seguridad y auditoría',
        descripcion:
          'Políticas de acceso, duración de sesiones y el log de auditoría: quién hizo qué y cuándo.',
        dentro: ['Sesiones', 'Doble factor', 'Logs de auditoría'],
        icono: 'seguridad',
      },
      {
        id: 'notificaciones',
        numero: '07',
        titulo: 'Notificaciones',
        descripcion:
          'Plantillas y canales de los avisos automáticos del campus, por correo y WhatsApp.',
        dentro: ['Plantillas', 'Correo', 'WhatsApp'],
        icono: 'notificaciones',
      },
    ],
  },
  {
    rotulo: 'Inteligencia y conexiones',
    nota: 'lo que hace funcionar la plataforma',
    areas: [
      {
        id: 'ia',
        numero: '02',
        titulo: 'IA / Eco',
        descripcion:
          'Prompts, parámetros y el modelo por paso del pipeline; umbral de confianza y narración TTS. Todo editable, sin tocar código.',
        dentro: ['System / user prompt', 'Modelo por paso', 'Umbral de confianza', 'Narración TTS'],
        icono: 'eco',
        href: '/configuracion/ia',
      },
      {
        id: 'integraciones',
        numero: '03',
        titulo: 'Integraciones',
        descripcion:
          'Zoom, MiCo+ (Mindray), CORA, pasarela de pagos y correo: estado, credenciales y sincronizaciones.',
        dentro: ['Servicios', 'Credenciales', 'Webhooks'],
        icono: 'integraciones',
      },
      {
        id: 'almacenamiento',
        numero: '06',
        titulo: 'Almacenamiento, media y LRS',
        descripcion:
          'Object storage de DICOM y video, límites por grupo, y la configuración del LRS (xAPI).',
        dentro: ['Object storage', 'Transcodificación', 'LRS xAPI'],
        icono: 'almacenamiento',
      },
    ],
  },
  {
    rotulo: 'Academia y marca',
    nota: 'las reglas del programa y la cara del campus',
    areas: [
      {
        id: 'academico',
        numero: '04',
        titulo: 'Académico global',
        descripcion:
          'Avales, plantillas de certificado, parámetros de competencia I-AIM y reglas de acreditación de horas.',
        dentro: ['Avales', 'Certificados', 'I-AIM', 'Horas'],
        icono: 'academico',
      },
      {
        id: 'badges',
        numero: '09',
        titulo: 'Badges y reconocimientos',
        descripcion:
          'Insignias con reglas automáticas —hitos, casos, competencia— o entregadas a mano, para alumnos y docentes.',
        dentro: ['Insignias', 'Reglas automáticas', 'Alumnos y docentes'],
        icono: 'badges',
      },
      {
        id: 'marca',
        numero: '05',
        titulo: 'Marca y apariencia',
        descripcion:
          'Logo, paleta, tipografía y dominios del campus: cómo se ve la plataforma para el alumno.',
        dentro: ['Logo', 'Paleta', 'Dominios'],
        icono: 'marca',
      },
    ],
  },
];

/* ───────────────────────────── Pantalla ───────────────────────────── */

export function ConfigHub({ resumenEco }: { resumenEco: ResumenEco | null }) {
  const [busca, setBusca] = useState('');

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return GRUPOS;
    return GRUPOS.map((g) => ({
      ...g,
      areas: g.areas.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          a.descripcion.toLowerCase().includes(q) ||
          a.dentro.some((d) => d.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.areas.length > 0);
  }, [busca]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      {/* cabecera: el rol se declara, y la consecuencia de tocar algo aquí también */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
              Configuración del sistema
            </h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[10.5px] font-bold text-sidebar-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Solo súper admin
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Nueve áreas de gobierno. Hoy está abierta IA / Eco; el resto llega en sus sprints.
          </p>
        </div>

        <label className="ml-auto flex h-10 w-[300px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar un ajuste</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar un ajuste…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* ══ las nueve áreas, agrupadas por lo que gobiernan ══ */}
      <div className="mt-6 flex flex-col gap-6">
        {gruposFiltrados.map((g) => (
          <section key={g.rotulo}>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{g.rotulo}</h2>
              <span className="text-[11.5px] text-muted-foreground">{g.nota}</span>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>

            <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.areas.map((a) => (
                <li key={a.id}>
                  <TarjetaArea area={a} resumenEco={a.id === 'ia' ? resumenEco : null} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {gruposFiltrados.length === 0 && (
          <p className={`rounded-xl border border-border bg-card p-6 text-center text-[13px] ${softText}`}>
            Ninguna área coincide con «{busca.trim()}».
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Tarjeta de área ───────────────────────── */

function TarjetaArea({ area, resumenEco }: { area: Area; resumenEco: ResumenEco | null }) {
  const Icono = ICONOS[area.icono];
  const disponible = Boolean(area.href);

  const interior = (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] ${
            disponible
              ? 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icono className="h-[19px] w-[19px]" strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`${mono} text-[10px] text-muted-foreground`}>{area.numero}</span>
            <span className="text-[14.5px] font-bold leading-tight">{area.titulo}</span>
            {!disponible && (
              <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
                Próximamente
              </span>
            )}
          </span>
          <span
            className={`mt-1.5 block text-[12.5px] leading-relaxed ${softText}`}
            style={{ textWrap: 'pretty' }}
          >
            {area.descripcion}
          </span>
        </span>

        {disponible && (
          <ChevronRight
            aria-hidden
            className="mt-2 h-[17px] w-[17px] shrink-0 text-[color:var(--track)]"
            strokeWidth={2}
          />
        )}
      </div>

      {/* qué hay dentro */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {area.dentro.map((d) => (
          <span
            key={d}
            className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-medium ${softText}`}
          >
            {d}
          </span>
        ))}
      </div>

      {/* el dato que importa hoy — solo real (IA/Eco) */}
      {resumenEco && (
        <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
          <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            Config activa{' '}
            <span className="font-semibold text-foreground">{resumenEco.nombre}</span> · juicio{' '}
            <span className={mono}>{resumenEco.modeloJuicio}</span> · umbral{' '}
            <span className={mono}>{Math.round(resumenEco.umbralConfianza * 100)}%</span>
          </span>
          <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>
            v{resumenEco.version}
          </span>
        </div>
      )}
    </>
  );

  const claseBase =
    'flex h-full w-full flex-col rounded-xl border border-border bg-card p-[18px] text-left shadow-rest';

  if (disponible) {
    return (
      <Link
        href={area.href!}
        className={`${claseBase} transition-colors hover:border-primary ${focusRing}`}
      >
        {interior}
      </Link>
    );
  }

  return (
    <div className={`${claseBase} cursor-not-allowed opacity-75`} aria-disabled title="Disponible próximamente">
      {interior}
    </div>
  );
}
