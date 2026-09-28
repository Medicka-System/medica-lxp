import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { getDominioData } from '@/lib/datos';
import { getReconocimiento } from './certificados-datos';
import type {
  AjustesData,
  CertificadoPerfil,
  InsigniaItem,
  PerfilData,
} from '@/app/(campus)/cuenta/_components/tipos';
import { AJUSTES_MOCK } from '@/app/(campus)/cuenta/_components/tipos';

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
        especialidad: string | null;
        sede: string | null;
        sobre_mi: string | null;
        intereses: string[] | null;
        whatsapp: string | null;
        email: string | null;
        created_at: Date;
      }[]
    >`
      select avatar_url, especialidad, sede, sobre_mi, intereses, whatsapp, email, created_at
      from lxp.perfiles where user_id = ${sesion.userId}`;
    const p = perfilRows[0];

    const grupoRows = await sql<{ nombre: string }[]>`
      select nombre from lxp.cora_grupos_de(${sesion.userId}) limit 1`;
    const grupo = grupoRows[0]?.nombre ?? '—';

    const casos = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where id_alumno = ${sesion.userId}`)[0]?.n ?? 0;
    const colegas = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.conexiones_ateneo
      where estado = 'colegas' and (solicitante_id = ${sesion.userId} or receptor_id = ${sesion.userId})`)[0]?.n ?? 0;
    const aportes = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.comentarios_ateneo where autor_id = ${sesion.userId}`)[0]?.n ?? 0;

    const especialidad = p?.especialidad ?? 'Ultrasonografía';
    const sede = p?.sede ?? 'Campus Médica';
    const horas = dominio.horas.acreditadas;

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
        avatarUrl: p?.avatar_url ?? null,
        portadaUrl: null,
        sede,
        enCampusDesde: fmtMesAno.format(new Date(p?.created_at ?? Date.now())),
      },
      cora: {
        matricula: sesion.matricula,
        programa: sesion.programa,
        grupo,
      },
      cifras: [
        { id: 'horas', valor: String(horas), etiqueta: 'Horas de práctica', detalle: 'de 1000 h', href: '/dominio' },
        { id: 'casos', valor: String(casos), etiqueta: 'Casos subidos', detalle: 'a la bitácora', href: '/bitacora' },
        { id: 'colegas', valor: String(colegas), etiqueta: 'Colegas', detalle: 'en el Ateneo', href: '/ateneo?vista=colegas' },
        { id: 'aportes', valor: String(aportes), etiqueta: 'Aportes', detalle: 'en la comunidad', href: '/ateneo?vista=aportes' },
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

export async function getAjustesData(userId: string): Promise<AjustesData> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ preferencias: Partial<AjustesData> | null; email: string | null }[]>`
      select preferencias, email from lxp.perfiles where user_id = ${userId}`;
    const guardadas = rows[0]?.preferencias ?? {};
    const email = rows[0]?.email;

    // Defaults (forma) + lo guardado en preferencias. `cuenta` viene de auth
    // (Supabase · Sprint 11): aquí es demo, con el correo real en Google.
    const cuenta = {
      ...AJUSTES_MOCK.cuenta,
      vinculadas: AJUSTES_MOCK.cuenta.vinculadas.map((v) =>
        v.proveedor === 'google' && v.conectada && email ? { ...v, correo: email } : v,
      ),
    };

    return {
      avisos: guardadas.avisos ?? AJUSTES_MOCK.avisos,
      resumenSemanal: guardadas.resumenSemanal ?? AJUSTES_MOCK.resumenSemanal,
      noMolestar: guardadas.noMolestar ?? AJUSTES_MOCK.noMolestar,
      privacidad: guardadas.privacidad ?? AJUSTES_MOCK.privacidad,
      lectura: guardadas.lectura ?? AJUSTES_MOCK.lectura,
      idioma: guardadas.idioma ?? AJUSTES_MOCK.idioma,
      cuenta,
    };
  });
}
