/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PENDIENTE DE API — Contrato del dominio de HERENCIA programa→grupo (§2/§6)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La resolución de herencia (heredado vs personalizado + TIPO exacto del override),
 * la detección de RE-SINCRONIZACIÓN y las MUTACIONES de override NO son CRUD simple:
 * requieren `resolverHerencia` / `validarPatch` / `detectarResync` y la columna
 * `aplicado_sobre_version` de la migración 0012 (que vive en la rama sprint45-api,
 * NO en este worktree). Por eso el `web` NO las implementa: las consume del dominio
 * en `apps/api`. Este archivo fija la FORMA EXACTA que la UI espera; cuando el
 * endpoint exista, se cablea un cliente contra estos tipos.
 *
 * Lo que el `web` SÍ hace directo (Regla de Oro §2, ya implementado):
 *   • listar/instanciar grupos, editar datos del grupo (nombre/modalidad/fechas/docente)
 *   • leer la estructura heredada del programa y marcar en CRUDO qué nodos tienen
 *     override (existe fila en lxp.grupo_overrides) — sin interpretar el patch.
 *
 * ── Endpoints esperados (base: NEXT_PUBLIC/INTERNAL API del dominio) ──
 *
 * GET  /studio/grupos/:grupoId/herencia
 *      → VistaHerencia  (temario resuelto + overrides + avisos de resync)
 *
 * POST /studio/grupos/:grupoId/overrides
 *      body: PersonalizarInput
 *      → OverrideResuelto            (aplica validarPatch; sella aplicado_sobre_version)
 *
 * DELETE /studio/grupos/:grupoId/overrides/:overrideId
 *      → { ok: true }                (el nodo vuelve a HEREDADO)
 *
 * POST /studio/grupos/:grupoId/overrides/:overrideId/resync
 *      → OverrideResuelto            (adopta la versión nueva del programa en ese nodo)
 *
 * Autz: el guard del api valida el JWT (JWKS Supabase) y exige rol de autoría; el
 * `web` pasa el JWT del usuario (hoy DEV; Sprint 11 el real). RLS es el 2º candado.
 */

export type TipoOverride = 'oculta' | 'reemplaza' | 'extra' | 'fecha';

export type NodoLeccionVista = {
  id: string;
  titulo: string;
  /** 'heredado' o el tipo de override que este grupo aplicó. */
  herencia: 'heredado' | TipoOverride;
  /** true si el programa base cambió en este nodo overrideado (decide el docente). */
  avisoResync?: boolean;
};

export type NodoModuloVista = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  herencia: 'heredado' | TipoOverride;
  avisoResync?: boolean;
  /** Nota corta ("2 personalizaciones", "solo en este grupo", "se abre el 29 jun"). */
  nota?: string;
  lecciones: NodoLeccionVista[];
};

export type OverrideResuelto = {
  id: string;
  tipo: TipoOverride;
  entidad: 'modulo' | 'leccion' | 'contenido';
  entidadId: string;
  /** Etiqueta legible: "Módulo 04 · Lección 3". */
  donde: string;
  avisoResync?: boolean;
};

export type AvisoResync = {
  entidadId: string;
  donde: string;
  versionGrupo: number;
  versionNueva: number;
  /** Qué cambió en el programa ("agregó 3 bloques"). */
  detalle: string;
};

export type VistaHerencia = {
  grupoId: string;
  programaId: string;
  programaVersion: number;
  temario: NodoModuloVista[];
  overrides: OverrideResuelto[];
  resync: AvisoResync[];
};

/** Cuerpo para personalizar un nodo. El `patch` lo valida `validarPatch` en el api. */
export type PersonalizarInput = {
  entidad: 'modulo' | 'leccion' | 'contenido';
  entidadId: string;
  tipo: TipoOverride;
  /** Whitelist por tipo: oculta→{}, reemplaza→{recursoRef}, fecha→{fecha}, extra→{...}. */
  patch: Record<string, unknown>;
};
