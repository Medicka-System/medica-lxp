/**
 * Runtime SCORM del lado del navegador (§7 · pieza que faltaba). El contenido SCORM busca
 * un adaptador `window.API` (SCORM 1.2) o `window.API_1484_11` (SCORM 2004) subiendo por la
 * cadena de `window.parent`. Este módulo CONSTRUYE ese adaptador como un script que se inyecta
 * en el SHELL padre (mismo origen que el SCO vía `srcdoc` · ver `shell.ts`), de modo que el SCO
 * lo encuentre en `window.parent` sin postMessage.
 *
 * El adaptador es un STORE FIEL del CMI: guarda cada `SetValue`, responde `GetValue` desde el
 * store (sembrado con el estado previo para REANUDAR) y en `Commit`/`Finish`/`Terminate` manda
 * el CMI acumulado a `POST /scorm/commit` (web → `apps/api` POST /players/scorm/commit, que YA
 * interpreta CMI 1.2/2004 y persiste en `lxp.reproduccion_progreso`). La INTERPRETACIÓN del CMI
 * (lesson_status/score/…) vive en el backend (`scorm.ts`) — aquí NO se interpreta, solo se envía.
 *
 * Las funciones puras (`sembrarCmi`/`aplicarSetValue`/`leerGetValue`/`construirPayloadCommit`) se
 * EMBEDEN en el script del navegador vía `.toString()` → el MISMO código corre en el navegador y
 * se cubre con unit tests (sin duplicar la lógica).
 */

/** CMI aplanado tal como lo maneja el contenido (claves con/sin prefijo `cmi.`). */
export type Cmi = Record<string, unknown>;

/** Contexto que el shell inyecta al runtime (todo menos el alumnoId, que lo pone el servidor). */
export interface RuntimeCtx {
  /** Ruta (mismo origen) que recibe el commit y reenvía a `POST /players/scorm/commit`. */
  commitUrl: string;
  /** Ancla de progreso en `lxp.contenidos` (uuid). */
  contenidoId: string;
  /** Ancla por lección (modelo nuevo · mig 0026); null si no aplica. */
  leccionId: string | null;
  /** Título para el statement xAPI. */
  titulo: string | null;
  /** CMI previo del alumno (de `reproduccion_progreso.estado_scorm`) para reanudar; {} si limpio. */
  cmiPrevio: Cmi;
}

/** Siembra un store de CMI nuevo a partir del estado previo (copia superficial de claves propias). */
export function sembrarCmi(previo: Cmi | null | undefined): Cmi {
  const store: Cmi = {};
  if (previo && typeof previo === 'object') {
    for (const k of Object.keys(previo)) store[k] = (previo as Cmi)[k];
  }
  return store;
}

/** `SetValue(k,v)` del contenido: guarda el valor como string (el CMI es texto) y confirma. */
export function aplicarSetValue(store: Cmi, clave: string, valor: unknown): string {
  store[clave] = valor == null ? '' : String(valor);
  return 'true';
}

/** `GetValue(k)` del contenido: lee del store (reanudación incluida); '' si no existe. */
export function leerGetValue(store: Cmi, clave: string): string {
  const v = store[clave];
  return v == null ? '' : String(v);
}

/** Cuerpo del commit al backend (el alumnoId lo pone el servidor desde la sesión). */
export function construirPayloadCommit(
  store: Cmi,
  ctx: Pick<RuntimeCtx, 'contenidoId' | 'leccionId' | 'titulo'>,
): { contenidoId: string; leccionId: string | null; titulo: string | null; cmi: Cmi } {
  return { contenidoId: ctx.contenidoId, leccionId: ctx.leccionId, titulo: ctx.titulo, cmi: store };
}

/** Códigos de error estándar SCORM (el contenido consulta GetLastError/GetErrorString). */
export const ERRORES_SCORM: Record<string, string> = {
  '0': 'No error',
  '101': 'General exception',
  '201': 'Invalid argument error',
  '202': 'Element cannot have children',
  '203': 'Element not an array - cannot have count',
  '301': 'Not initialized',
  '401': 'Not implemented error',
  '402': 'Invalid set value, element is a keyword',
  '403': 'Element is read only',
  '404': 'Element is write only',
  '405': 'Incorrect data type',
};

/**
 * Serializa un objeto para incrustarlo SEGURO dentro de un `<script>`: escapa `<` (rompe
 * `</script>`) y los separadores de línea U+2028/U+2029 (válidos en JSON, ilegales en un
 * literal JS). Por char-code → sin caracteres especiales en el fuente.
 */
export function jsonSeguro(v: unknown): string {
  let out = '';
  for (const ch of JSON.stringify(v)) {
    const c = ch.charCodeAt(0);
    out += c === 0x3c || c === 0x2028 || c === 0x2029 ? '\\u' + c.toString(16).padStart(4, '0') : ch;
  }
  return out;
}

/**
 * Construye el `<script>` (cuerpo JS) del runtime, listo para incrustar en el `<head>` del shell.
 * Expone `window.API` (1.2) y `window.API_1484_11` (2004); ambos comparten UN store sembrado con
 * `cmiPrevio`. Reutiliza las funciones puras de arriba vía `.toString()` (mismo código testeado).
 */
export function construirRuntimeScript(ctx: RuntimeCtx): string {
  return `
(function () {
  var CTX = ${jsonSeguro(ctx)};
  var ERR = ${jsonSeguro(ERRORES_SCORM)};
  ${sembrarCmi.toString()}
  ${aplicarSetValue.toString()}
  ${leerGetValue.toString()}
  ${construirPayloadCommit.toString()}
  var store = sembrarCmi(CTX.cmiPrevio);
  var lastError = '0';
  var iniciado = false, terminado = false;

  function enviarCommit(usarBeacon) {
    try {
      var payload = JSON.stringify(construirPayloadCommit(store, CTX));
      if (usarBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(CTX.commitUrl, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(CTX.commitUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
          credentials: 'same-origin',
        }).catch(function () {});
      }
    } catch (e) { /* el commit nunca debe tumbar al contenido */ }
    return 'true';
  }

  function iniciar() {
    if (iniciado && !terminado) { lastError = '101'; return 'false'; }
    iniciado = true; terminado = false; lastError = '0'; return 'true';
  }
  function terminar() {
    if (!iniciado || terminado) { lastError = '301'; return 'false'; }
    terminado = true; lastError = '0'; enviarCommit(true); return 'true';
  }

  var base12 = {
    LMSInitialize: function () { return iniciar(); },
    LMSFinish: function () { return terminar(); },
    LMSGetValue: function (k) { lastError = '0'; return leerGetValue(store, k); },
    LMSSetValue: function (k, v) { lastError = '0'; return aplicarSetValue(store, k, v); },
    LMSCommit: function () { lastError = '0'; return enviarCommit(false); },
    LMSGetLastError: function () { return lastError; },
    LMSGetErrorString: function (c) { return ERR[String(c)] || ''; },
    LMSGetDiagnostic: function (c) { return ERR[String(c)] || ''; },
  };
  var base2004 = {
    Initialize: function () { return iniciar(); },
    Terminate: function () { return terminar(); },
    GetValue: function (k) { lastError = '0'; return leerGetValue(store, k); },
    SetValue: function (k, v) { lastError = '0'; return aplicarSetValue(store, k, v); },
    Commit: function () { lastError = '0'; return enviarCommit(false); },
    GetLastError: function () { return lastError; },
    GetErrorString: function (c) { return ERR[String(c)] || ''; },
    GetDiagnostic: function (c) { return ERR[String(c)] || ''; },
  };
  window.API = base12;
  window.API_1484_11 = base2004;
  // Red de seguridad: si el alumno cierra sin Finish/Terminate, manda el último CMI (beacon).
  window.addEventListener('pagehide', function () { if (iniciado && !terminado) enviarCommit(true); });
})();
`.trim();
}
