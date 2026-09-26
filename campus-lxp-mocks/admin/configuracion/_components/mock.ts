/** Mock general de Configuración. En producción, todo llega de la BD por props. */

import type { ConfiguracionData } from "./tipos";

export const MOCK: ConfiguracionData = {
  critica: {
    titulo: "MiCo+ está caída desde las 11:42.",
    detalle:
      "Es lo único en rojo de esta pantalla: la sesión de mañana 18:30 depende del equipo. Revise credenciales en Integraciones.",
    cta: "Abrir Integraciones",
    area: "integraciones",
  },
  avisos: [
    { id: "v1", titulo: "Claves de API sin rotar", valor: "2 de 5", detalle: "Zoom y CORA llevan 11 meses con la misma clave.", area: "Seguridad", tono: "warn" },
    { id: "v2", titulo: "Aval académico por renovar", valor: "38 días", detalle: "Universidad La Salle · Ultrasonografía Médica.", area: "Académico", tono: "warn" },
    { id: "v3", titulo: "Gasto de Eco en el periodo", valor: "61% del tope", detalle: "$1 840 de $3 000 · proyecta $2 410 al cierre.", area: "IA / Eco", tono: "info" },
  ],
  grupos: [
    {
      rotulo: "Personas y acceso",
      nota: "quién entra y qué puede hacer",
      areas: [
        {
          id: "usuarios",
          numero: "01",
          titulo: "Usuarios y roles",
          descripcion:
            "Alta de staff y asignación de roles: súper admin, admin, docente y diseñador, con sus permisos.",
          dentro: ["128 usuarios", "4 roles", "Permisos por sección"],
          estado: "3 solicitudes",
          tono: "warn",
          icono: "usuarios",
          pie: { tipo: "texto", texto: "2 docentes nuevos y 1 cambio de rol esperan aprobación" },
        },
        {
          id: "seguridad",
          numero: "08",
          titulo: "Seguridad y auditoría",
          descripcion:
            "Políticas de acceso, duración de sesiones y el log de auditoría: quién hizo qué y cuándo.",
          dentro: ["Sesiones", "Doble factor", "Logs de auditoría"],
          estado: "2 claves sin rotar",
          tono: "warn",
          icono: "seguridad",
          pie: { tipo: "texto", texto: "18 420 eventos registrados este mes · retención 24 meses" },
        },
        {
          id: "notificaciones",
          numero: "07",
          titulo: "Notificaciones",
          descripcion:
            "Plantillas y canales de los avisos automáticos del campus, por correo y WhatsApp.",
          dentro: ["14 plantillas", "Correo", "WhatsApp"],
          estado: "Al día",
          tono: "ok",
          icono: "notificaciones",
          pie: { tipo: "texto", texto: "1 284 envíos en 24 h · 0.4% de rebote" },
        },
      ],
    },
    {
      rotulo: "Inteligencia y conexiones",
      nota: "lo que hace funcionar la plataforma",
      areas: [
        {
          id: "ia",
          numero: "02",
          titulo: "IA / Eco",
          descripcion:
            "Modelo por tarea del pipeline, umbral de auto-aprobación, autonomía de Eco, el RAG y el costo del periodo.",
          dentro: ["Modelos por tarea", "Umbrales", "RAG e índice", "Costos"],
          estado: "61% del tope",
          tono: "info",
          icono: "eco",
          pie: { tipo: "barra", pct: 61, color: "info", texto: "$1 840 / $3 000" },
        },
        {
          id: "integraciones",
          numero: "03",
          titulo: "Integraciones",
          descripcion:
            "Zoom, MiCo+ (Mindray), CORA, pasarela de pagos y correo: estado, credenciales y sincronizaciones.",
          dentro: ["5 servicios", "Credenciales", "Webhooks"],
          estado: "1 caída",
          tono: "down",
          icono: "integraciones",
          pie: {
            tipo: "semaforo",
            estados: ["down", "ok", "ok", "warn", "ok"],
            texto: "MiCo+ caída · pasarela degradada · 3 operativas",
          },
        },
        {
          id: "almacenamiento",
          numero: "06",
          titulo: "Almacenamiento, media y LRS",
          descripcion:
            "Object storage de DICOM y video, límites por grupo, y la configuración del LRS (xAPI).",
          dentro: ["4.8 / 8 TB", "Transcodificación", "LRS xAPI"],
          estado: "60% usado",
          tono: "ok",
          icono: "almacenamiento",
          pie: { tipo: "barra", pct: 60, color: "primary", texto: "13 meses" },
        },
      ],
    },
    {
      rotulo: "Academia y marca",
      nota: "las reglas del programa y la cara del campus",
      areas: [
        {
          id: "academico",
          numero: "04",
          titulo: "Académico global",
          descripcion:
            "Avales, plantillas de certificado, parámetros de competencia I-AIM y reglas de acreditación de horas.",
          dentro: ["1 aval", "3 plantillas", "I-AIM", "Horas"],
          estado: "Aval por renovar",
          tono: "warn",
          icono: "academico",
          pie: { tipo: "texto", texto: "Universidad La Salle · vence en 38 días" },
        },
        {
          id: "badges",
          numero: "09",
          titulo: "Badges y reconocimientos",
          descripcion:
            "Insignias con reglas automáticas —hitos, casos, competencia— o entregadas a mano, para alumnos y docentes.",
          dentro: ["12 insignias", "Reglas automáticas", "Alumnos y docentes"],
          estado: "2 borradores",
          tono: "neutro",
          icono: "badges",
          pie: { tipo: "texto", texto: "848 insignias otorgadas · 3 reglas activas" },
        },
        {
          id: "marca",
          numero: "05",
          titulo: "Marca y apariencia",
          descripcion:
            "Logo, paleta, tipografía y dominios del campus: cómo se ve la plataforma para el alumno.",
          dentro: ["Logo", "Paleta", "Dominios"],
          estado: "Publicada",
          tono: "ok",
          icono: "marca",
          pie: {
            tipo: "paleta",
            colores: ["#53c3be", "#1a8880", "#0f2d52", "#F8F9FA"],
            texto: "campus.medicacapacitacion.mx",
          },
        },
      ],
    },
  ],
  auditoria: {
    retencionMeses: 24,
    eventosMes: 18420,
    cambios: [
      { id: "c1", ini: "RV", quien: "Rodrigo V.", accion: "subió el tope de gasto de Eco", donde: "$2 500 → $3 000 · IA / Eco", cuando: "hace 2 h" },
      { id: "c2", ini: "RV", quien: "Rodrigo V.", accion: "creó la insignia “Primer caso validado”", donde: "regla automática · Badges", cuando: "ayer" },
      { id: "c3", ini: "SG", quien: "Sandra G.", accion: "rotó las credenciales de la pasarela", donde: "Integraciones", cuando: "hace 3 días" },
      { id: "c4", ini: "RV", quien: "Rodrigo V.", accion: "cambió la retención de logs a 24 meses", donde: "Seguridad y auditoría", cuando: "hace 5 días" },
    ],
  },
};
