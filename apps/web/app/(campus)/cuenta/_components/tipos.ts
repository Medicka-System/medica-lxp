/**
 * Tipos y datos de referencia de la CUENTA del alumno (§5A · pantallas /perfil y
 * /ajustes). Los mocks (PERFIL_MOCK / AJUSTES_MOCK) sirven de fallback y de forma:
 * en producción los datos entran por props desde la BD (lxp.perfiles + proyecciones
 * + CORA solo lectura · §2/§10).
 */

// ══ MI PERFIL ══════════════════════════════════════════════════════════════

/** Una de las 4 cifras de la portada (horas, casos, colegas, aportes). */
export type Cifra = {
  id: 'horas' | 'casos' | 'colegas' | 'aportes';
  valor: string;
  etiqueta: string;
  detalle: string;
  href: string;
};

/** Datos de contacto — todos editables por el alumno (§ origen). */
export type Contacto = {
  nombre: string;
  especialidad: string;
  correo: string;
  whatsapp: string;
};

/** Identidad de portada (nombre visible + foto + metadatos). */
export type AlumnoPerfil = {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  portadaUrl: string | null;
  sede: string;
  enCampusDesde: string; // "septiembre 2025"
};

/** Datos académicos — de CORA, SOLO LECTURA (§10). */
export type CoraDatos = {
  matricula: string;
  programa: string;
  grupo: string;
};

/** Un dominio I-AIM en el resumen de competencia del rail. */
export type DominioItem = {
  nombre: string;
  valor: number; // 0–100
  enRepaso: boolean;
};

export type DominioPerfil = {
  general: number; // competencia general 0–100
  dominios: DominioItem[];
};

/** Insignia (badge). `icono` es la clave de un ícono de Lucide. */
export type InsigniaItem = {
  id: string;
  nombre: string;
  icono: string;
  obtenida: boolean;
};

export type CertificadoPerfil = {
  id: string;
  titulo: string;
  aval: string;
  fecha: string;
  folio: string;
};

export type PerfilData = {
  alumno: AlumnoPerfil;
  cora: CoraDatos;
  cifras: Cifra[];
  sobreMi: string;
  intereses: string[];
  contacto: Contacto;
  dominio: DominioPerfil;
  insignias: InsigniaItem[];
  totalInsignias: number;
  certificados: CertificadoPerfil[];
};

// ══ AJUSTES ════════════════════════════════════════════════════════════════

export type Canal = 'app' | 'correo' | 'whatsapp';

/**
 * Toggles de notificación por CATEGORÍA (§4.2). Alimentan el motor real
 * (`lxp.preferencias_notificaciones`, mig 0020) vía notif-taxonomia.expandir. In-app
 * siempre on (contrato); aquí solo viven Correo/WhatsApp por categoría.
 */
export type { NotifToggles } from './notif-taxonomia';
import type { NotifToggles } from './notif-taxonomia';

export type NoMolestar = { activo: boolean; desde: string; hasta: string };

export type PrivacidadPref = {
  perfilVisible: boolean;
  aceptarColegas: boolean;
  mostrarEnLinea: boolean;
  casosABiblioteca: boolean;
};

export type TemaLectura = 'claro' | 'sepia' | 'oscuro';

export type LecturaPref = {
  tema: TemaLectura;
  tamano: number; // 15 | 16.5 | 18 | 20
  reducirAnimaciones: boolean;
  subtitulos: boolean;
};

export type CuentaVinculada = {
  proveedor: 'google' | 'microsoft';
  conectada: boolean;
  nombre: string | null;
  correo: string | null;
};

export type SesionActiva = {
  id: string;
  dispositivo: string;
  tipo: 'monitor' | 'celular';
  lugar: string;
  cuando: string;
  actual: boolean;
};

/** Cuenta y acceso — derivado de auth (Supabase · Sprint 11), no de preferencias. */
export type CuentaPref = {
  vinculadas: CuentaVinculada[];
  contrasenaCambiada: string;
  sesiones: SesionActiva[];
};

export type IdiomaPref = {
  idioma: 'es-MX' | 'en';
  zona: string;
};

export type AjustesData = {
  /** Notificaciones → motor real (preferencias_notificaciones), NO perfiles.preferencias. */
  notificaciones: NotifToggles;
  /** Deshabilitados "próximamente" (sus productores no existen): solo se muestran. */
  resumenSemanal: boolean;
  noMolestar: NoMolestar;
  privacidad: PrivacidadPref;
  lectura: LecturaPref;
  cuenta: CuentaPref;
  idioma: IdiomaPref;
};

export type SeccionAjustes = 'notificaciones' | 'privacidad' | 'lectura' | 'cuenta' | 'idioma';

/**
 * Lo que se persiste en `lxp.perfiles.preferencias` (jsonb) — SOLO estos dominios. Las
 * notificaciones viven en su propio store (preferencias_notificaciones); `cuenta` es de auth
 * (Sprint 11); resumen/no-molestar están deshabilitados (sin productor). `guardarPreferencias`
 * hace MERGE POR DOMINIO con un `Partial` de esto.
 */
export type PreferenciasPerfil = Pick<AjustesData, 'privacidad' | 'lectura' | 'idioma'>;

export const TAMANOS_LECTURA = [15, 16.5, 18, 20] as const;

// ══ MOCKS (forma + fallback) ══════════════════════════════════════════════

export const PERFIL_MOCK: PerfilData = {
  alumno: {
    id: '00000000-0000-0000-0000-000000000000',
    nombre: 'Dra. Ana López',
    avatarUrl: null,
    portadaUrl: null,
    sede: 'Guadalajara',
    enCampusDesde: 'septiembre 2025',
  },
  cora: {
    matricula: 'MC-2025-0147',
    programa: 'Ultrasonografía Médica · 1000 h',
    grupo: 'Grupo B · 2025',
  },
  cifras: [
    { id: 'horas', valor: '312', etiqueta: 'Horas de práctica', detalle: 'de 1000 h', href: '/dominio' },
    { id: 'casos', valor: '48', etiqueta: 'Casos subidos', detalle: 'a la bitácora', href: '/bitacora' },
    { id: 'colegas', valor: '23', etiqueta: 'Colegas', detalle: 'en el Ateneo', href: '/ateneo?vista=colegas' },
    { id: 'aportes', valor: '61', etiqueta: 'Aportes', detalle: 'en la comunidad', href: '/ateneo?vista=aportes' },
  ],
  sobreMi:
    'Médica general en formación POCUS. Me interesa el ultrasonido a pie de cama en urgencias y el seguimiento obstétrico.',
  intereses: ['#pocus', '#obstetricia', '#urgencias', '#abdomen'],
  contacto: {
    nombre: 'Dra. Ana López',
    especialidad: 'Ultrasonografía',
    correo: 'ana.lopez@ejemplo.mx',
    whatsapp: '+52 33 1234 5678',
  },
  dominio: {
    general: 74,
    dominios: [
      { nombre: 'Indicación', valor: 82, enRepaso: false },
      { nombre: 'Adquisición', valor: 61, enRepaso: true },
      { nombre: 'Interpretación', valor: 78, enRepaso: false },
      { nombre: 'Decisión médica', valor: 75, enRepaso: false },
    ],
  },
  insignias: [
    { id: '1', nombre: 'Primeras 100 h', icono: 'Clock', obtenida: true },
    { id: '2', nombre: 'Primer caso', icono: 'Stethoscope', obtenida: true },
    { id: '3', nombre: 'Racha 7 días', icono: 'Flame', obtenida: true },
    { id: '4', nombre: '10 casos', icono: 'FolderCheck', obtenida: true },
    { id: '5', nombre: 'Ateneo activo', icono: 'MessagesSquare', obtenida: false },
    { id: '6', nombre: '500 h', icono: 'Trophy', obtenida: false },
  ],
  totalInsignias: 12,
  certificados: [
    {
      id: '1',
      titulo: 'Fundamentos de POCUS',
      aval: 'Médica Capacitación',
      fecha: '12 ago 2025',
      folio: 'CERT-2025-0031',
    },
  ],
};

export const AJUSTES_MOCK: AjustesData = {
  // Forma/fallback; los valores reales salen de preferencias_notificaciones (getAjustesData).
  notificaciones: {
    misCasos: { correo: true, whatsapp: false },
    consultas: { correo: true, whatsapp: false },
    entregas: { correo: true, whatsapp: false },
    logros: { correo: true, whatsapp: true },
    aprendizaje: { correo: true, whatsapp: false },
    anuncios: { correo: true, whatsapp: false },
  },
  resumenSemanal: true,
  noMolestar: { activo: false, desde: '22:00', hasta: '07:00' },
  privacidad: {
    perfilVisible: true,
    aceptarColegas: true,
    mostrarEnLinea: true,
    casosABiblioteca: false,
  },
  lectura: { tema: 'claro', tamano: 16.5, reducirAnimaciones: false, subtitulos: false },
  cuenta: {
    vinculadas: [
      { proveedor: 'google', conectada: true, nombre: 'Ana López', correo: 'ana.lopez@gmail.com' },
      { proveedor: 'microsoft', conectada: false, nombre: null, correo: null },
    ],
    contrasenaCambiada: 'hace 3 meses',
    sesiones: [
      { id: 's1', dispositivo: 'Chrome · Windows', tipo: 'monitor', lugar: 'Guadalajara · ahora', cuando: 'ahora', actual: true },
      { id: 's2', dispositivo: 'Safari · iPhone', tipo: 'celular', lugar: 'Guadalajara · hace 2 días', cuando: 'hace 2 días', actual: false },
    ],
  },
  idioma: { idioma: 'es-MX', zona: 'America/Mexico_City' },
};
