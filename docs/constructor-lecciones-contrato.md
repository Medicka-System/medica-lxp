# Contrato del constructor de lecciones (rediseño base · §5C)

> Rama `lecc-modelo`. Esta base deja **el modelo y el flujo**; **no** los editores de
> cada tipo. Un agente que construya el editor de un tipo consume este contrato y
> **no toca el modelo ni el builder**.

## 1. Modelo (mig `0023_leccion_tipo_bloques.sql`)

Una lección es **mono-tipo**. `lxp.lecciones` gana:

| Columna | Tipo | Nota |
|---|---|---|
| `tipo` | `lxp.leccion_tipo` | enum: `teoria · video · autoevaluacion · tarea · foro · h5p · xapi`. Default `'teoria'` (seed-safe). |
| `config` | `jsonb` | Config de los tipos **config-backed**. Default `{}`. Vacío en teoría. |

Tabla nueva **`lxp.bloques`** (solo para lecciones tipo `teoria`, contenido ordenable):

```
id uuid · leccion_id uuid (fk→lecciones, on delete cascade)
orden int · tipo_bloque text · config jsonb · created_at · updated_at
```

- `tipo_bloque` es **text a propósito** (no enum): el editor de teoría define sus
  sub-tipos (párrafo, imagen, cine-loop, KaTeX, cita…) sin pedir otra migración.
- RLS: lectura `authenticated`; escritura `lxp.es_autoria()` (mismo patrón que
  `contenidos` · mig 0010). El alumno **lee** (para renderizar); solo autoría escribe.
- Horas siguen **por lección** (mig 0022, sin cambios).

### Dónde vive el contenido de cada tipo

| Tipo | Almacén | Dónde |
|---|---|---|
| `teoria` | `bloques` | filas ordenables en `lxp.bloques` |
| `video`, `autoevaluacion`, `tarea`, `foro`, `h5p`, `xapi` | `config` | objeto único en `lxp.lecciones.config` |

`INFO_TIPO_LECCION[tipo].almacen` (en `apps/web/lib/studio/leccion-tipos.ts`) devuelve
`'bloques' | 'config'` en código.

> **Tablas viejas intactas.** `lxp.contenidos` y `lxp.actividades` (mig 0002/0003)
> **no** se tocaron: siguen alimentando al reader del alumno y a los flujos ya
> construidos. Si un tipo necesita puentear datos viejos (p. ej. teoría desde
> `contenidos` tipo `texto` → `bloques`), es decisión de **ese** editor, no del modelo.

## 2. Flujo (ya construido)

- **Agregar lección** → abre el **selector de tipo** (los 7, con ícono + descripción).
  Elegir crea la lección con ese `tipo` vía `crearLeccion(programaId, moduloId, tipo)`
  (`apps/web/lib/studio/acciones.ts`). El tipo se fija al crear.
- Al abrir una lección, el builder **detecta `leccion.tipo`** y renderiza
  `EditorDeLeccion` (`_components/editores-leccion.tsx`), que hoy muestra un
  **placeholder** por tipo ("Editor de … — próximamente").

## 3. Cómo enchufa un agente su editor (sin tocar el modelo)

1. Construye tu componente con la firma **`EditorLeccionProps`**
   (`apps/web/lib/studio/leccion-tipos.ts`):

   ```ts
   type EditorLeccionProps = {
     programaId: string;
     leccionId: string;
     tipo: TipoLeccion;
     titulo: string;
     config: Record<string, unknown>;   // == lecciones.config (tipos config-backed)
     bloques: BloqueTeoria[];            // == filas de lxp.bloques (solo teoría)
     correr: (accion: () => Promise<void>) => void; // ejecuta server action + feedback "guardado"
   };
   ```

2. Reemplaza la entrada de tu tipo en **`EDITORES_LECCION`**
   (`_components/editores-leccion.tsx`) por tu componente. El resto sigue en placeholder.

3. Persiste con **server actions** (CRUD directo `web → Supabase` bajo RLS ·
   Regla de Oro §2 · **nunca** NestJS). Añade tus acciones en
   `apps/web/lib/studio/acciones.ts` (usan `comoStaff` → policies `es_autoria`):
   - **tipos `config`**: `update lxp.lecciones set config = … where id = leccionId`.
   - **tipo `teoria`**: insert/update/delete + reorden sobre `lxp.bloques`
     (patrón de reorden por intercambio de `orden`, como `moverLeccion`).
   - Refresca con `revalidatePath('/studio/programas/<programaId>')`.

4. `correr` (lo pasa el builder) envuelve tu acción y actualiza el indicador
   "guardado" del header — úsalo para no duplicar el feedback.

## 4. Reglas

- **Solo esquema `lxp`**; jamás el `public` de CORA (§10).
- No cambies `leccion_tipo`, `lecciones.config` ni `lxp.bloques` sin migración nueva
  y acuerdo (romperías a los demás editores).
- `EditorLeccionProps` es el contrato estable: si necesitas más datos, cárgalos en tu
  editor con su propia lectura bajo RLS, no cambies la firma.

## 5. Verificación del modelo

```bash
pnpm --filter db migrate:up
pnpm --filter db seed
pnpm --filter db test:model   # forma del esquema, seed-safe, bloques, RLS
pnpm --filter db test:rls     # convivencia sin regresiones
```
