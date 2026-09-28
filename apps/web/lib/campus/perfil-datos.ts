import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { getDominioData } from '@/lib/datos';
import { firmarLecturaImagenes } from '@/lib/media/firmar-imagenes.server';
import { getReconocimiento } from './certificados-datos';
import type {
  AjustesData,
  CertificadoPerfil,
  InsigniaItem,
  LecturaPref,
  PerfilData,
  TemaLectura,
} from '@/app/(campus)/cuenta/_components/tipos';
import { AJUSTES_MOCK } from '@/app/(campus)/cuenta/_components/tipos';
import { contraer } from '@/app/(campus)/cuenta/_components/notif-taxonomia';

/**
 * Lectura de Mi perfil y Ajustes (§ /perfil · /ajustes). TODO corre con RLS vía
 * `comoAlumno`: el alumno solo ve lo suyo. Los campos editables + preferencias
 * viven en `lxp.perfiles` (mig 0056); matrícula/programa/grupo se LEEN de CORA por
 * funciones SECURITY DEFINER (§10, nunca se escriben). Las cifras y el dominio son
 * proyecciones calculadas por el worker (solo lectura · §6/§8).
 */

const fmtMesAno = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** Ícono de Lucide por clave de badge (fallback: Award). */
const ICONO_POR_CLAVE: Record<string, string> = {
  horas_100: 'Clock',
  horas_500: 'Trophy',
  horas_1000: 'Trophy',
  primer_caso: 'Stethoscope',
  diez_casos: 'FolderCheck',
  racha: 'Flame',
  ateneo: 'MessagesSquare',
};

type SesionBasica = {
  userId: string;
  nombre: string;
  email: string;
  matricula: string;
  programa: string;
};

export async function getPerfilData(sesion: SesionBasica): Promise<PerfilData> {
  const [dominio, reconocimiento] = await Promise.all([
    getDominioData(sesion.userId),
    getReconocimiento(sesion.userId),
  ]);

  return comoAlumno(sesion.userId, async (sql) => {
    const perfilRows = await sql<
      {
        avatar_url: string | null;
        portada_url: string | null;
        especialidad: string | null;
        sede: string | null;
        sobre_mi: string | null;
        intereses: string[] | null;
        whatsapp: string | null;
        email: string | null;
        created_at: Date;
      }[]
    >`
      select avatar_url, portada_url, especialidad, sede, sobre_mi, intereses, whatsapp, email, created_at
      from lxp.perfiles where user_id = ${sesion.userId}`;
    const p = perfilRows[0];

    const grupoRows = await sql<{ nombre: string }[]>`
      select nombre from lxp.cora_grupos_de(${sesion.userId}) limit 1`;
    const grupo = grupoRows[0]?.nombre ?? '—';

    const casos = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where id_alumno = ${sesion.userId}`)[0]?.n ?? 0;
    const casosValidados = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos
      where id_alumno = ${sesion.userId} and estado_validacion = 'aprobado'`)[0]?.n ?? 0;
    const colegas = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.conexiones_ateneo
      where estado = 'colegas' and (solicitante_id = ${sesion.userId} or receptor_id = ${sesion.userId})`)[0]?.n ?? 0;
    const solicitudes = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.conexiones_ateneo
      where receptor_id = ${sesion.userId} and estado = 'pendiente'`)[0]?.n ?? 0;
    const aportes = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.comentarios_ateneo where autor_id = ${sesion.userId}`)[0]?.n ?? 0;
    const aportesSemana = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.comentarios_ateneo
      where autor_id = ${sesion.userId} and created_at >= now() - interval '7 days'`)[0]?.n ?? 0;

    // Firma la lectura (vida corta) de avatar/portada (refs media/imagenes/* · §2).
    const urls = await firmarLecturaImagenes([p?.avatar_url, p?.portada_url]);
    const avatarUrl = (p?.avatar_url && urls[p.avatar_url]) || null;
    const portadaUrl = (p?.portada_url && urls[p.portada_url]) || null;

    const especialidad = p?.especialidad ?? 'Ultrasonografía';
    const sede = p?.sede ?? 'Campus Médica';
    const horas = dominio.horas.acreditadas;
    const pctHoras = Math.round((horas / 1000) * 100);

    const insignias: InsigniaItem[] = reconocimiento.badges.map((b, i) => ({
      id: `${b.clave}-${i}`,
      nombre: b.nombre,
      icono: ICONO_POR_CLAVE[b.clave] ?? 'Award',
      obtenida: b.otorgado,
    }));

    const certificados: CertificadoPerfil[] = reconocimiento.certificados.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      aval: 'Médica Capacitación',
      fecha: fmtFecha.format(new Date(c.emitidoEn)),
      folio: c.folio,
    }));

    return {
      alumno: {
        id: sesion.userId,
        nombre: sesion.nombre,
        avatarUrl,
        portadaUrl,
        sede,
        enCampusDesde: fmtMesAno.format(new Date(p?.created_at ?? Date.now())),
      },
      cora: {
        matricula: sesion.matricula,
        programa: sesion.programa,
        grupo,
      },
      cifras: [
        { id: 'horas', valor: String(horas), etiqueta: 'h acreditadas', detalle: `de 1000 · ${pctHoras}%`, href: '/dominio' },
        {
          id: 'casos',
          valor: String(casos),
          etiqueta: 'casos presentados',
          detalle: casosValidados > 0 ? `${casosValidados} validados` : 'sin validar aún',
          href: '/bitacora',
        },
        {
          id: 'colegas',
          valor: String(colegas),
          etiqueta: 'colegas',
          detalle: solicitudes > 0 ? `${solicitudes} solicitudes` : 'sin solicitudes',
          href: '/ateneo?vista=colegas',
        },
        {
          id: 'aportes',
          valor: String(aportes),
          etiqueta: 'aportes al Ateneo',
          detalle: aportesSemana > 0 ? `${aportesSemana} esta semana` : 'sin aportes esta semana',
          href: '/ateneo?vista=aportes',
        },
      ],
      sobreMi: p?.sobre_mi ?? '',
      intereses: p?.intereses ?? [],
      contacto: {
        nombre: sesion.nombre,
        especialidad,
        correo: p?.email ?? sesion.email,
        whatsapp: p?.whatsapp ?? '',
      },
      dominio: {
        general: dominio.general.nivel,
        dominios: dominio.dominios.map((d) => ({
          nombre: d.dominio,
          valor: d.nivel,
          enRepaso: d.estado === 'repaso' || d.estado === 'caida',
        })),
      },
      insignias,
      totalInsignias: insignias.length,
      certificados,
    };
  });
}

/**
 * Preferencia de LECTURA del servidor (perfiles.preferencias.lectura), ligera, para hidratar el
 * modo lectura del shell en el arranque (cross-device). Cae a los defaults si no hay nada.
 */
export async function getLecturaPref(
  userId: string,
): Promise<{ tema: TemaLectura; tamano: number; reducirAnimaciones: boolean }> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ lectura: LecturaPref | null }[]>`
      select preferencias->'lectura' as lectura from lxp.perfiles where user_id = ${userId}`;
    const l = rows[0]?.lectura;
    return {
      tema: l?.tema ?? AJUSTES_MOCK.lectura.tema,
      tamano: typeof l?.tamano === 'number' ? l.tamano : AJUSTES_MOCK.lectura.tamano,
      reducirAnimaciones: l?.reducirAnimaciones ?? AJUSTES_MOCK.lectura.reducirAnimaciones,
    };
  });
}

export async function getAjustesData(userId: string): Promise<AjustesData> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ preferencias: Partial<AjustesData> | null; email: string | null }[]>`
      select preferencias, email from lxp.perfiles where user_id = ${userId}`;
    const guardadas = rows[0]?.preferencias ?? {};
    const email = rows[0]?.email;

    // Notificaciones: del MOTOR real (preferencias_notificaciones), no de perfiles.preferencias.
    // Se contraen los overrides por tipo a los toggles por categoría (defaults del contrato).
    const notifRows = await sql<{ preferencias: import('@campus/shared').PreferenciasNotificacion }[]>`
      select preferencias from lxp.preferencias_notificaciones where id_usuario = ${userId} limit 1`;
    const notificaciones = contraer(notifRows[0]?.preferencias ?? {});

    // Defaults (forma) + lo guardado en preferencias. `cuenta` viene de auth
    // (Supabase · Sprint 11): aquí es demo, con el correo real en Google.
    const cuenta = {
      ...AJUSTES_MOCK.cuenta,
      vinculadas: AJUSTES_MOCK.cuenta.vinculadas.map((v) =>
        v.proveedor === 'google' && v.conectada && email ? { ...v, correo: email } : v,
      ),
    };

    return {
      notificaciones,
      resumenSemanal: guardadas.resumenSemanal ?? AJUSTES_MOCK.resumenSemanal,
      noMolestar: guardadas.noMolestar ?? AJUSTES_MOCK.noMolestar,
      privacidad: guardadas.privacidad ?? AJUSTES_MOCK.privacidad,
      lectura: guardadas.lectura ?? AJUSTES_MOCK.lectura,
      idioma: guardadas.idioma ?? AJUSTES_MOCK.idioma,
      cuenta,
    };
  });
}
