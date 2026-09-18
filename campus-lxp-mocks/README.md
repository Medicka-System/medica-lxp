# Campus Virtual · Médica Capacitación — mocks de pantallas

LXP médico de ultrasonido. Mocks de alta fidelidad en **Next.js App Router + TypeScript +
Tailwind**, íconos **lucide-react**, tipografía **Inter** (mono del sistema solo para cifras,
folios, matrículas y horas). Cada pantalla trae sus **datos mock tipados por props** y sus
**handlers como stubs** listos para cablear.

## Cómo llevarlo a tu proyecto

1. Copia `globals.css` a `app/globals.css` (o mézclalo con el tuyo: son solo tokens en `:root`).
2. Copia `components/` a la raíz del proyecto y confirma el alias `@/components/*` en
   `tsconfig.json`.
3. Copia las carpetas de pantalla dentro de `app/`, con los route groups que uses:
   `app/(campus)/…` para el alumno y `app/(studio)/…` para el back office.
4. Las pantallas de detalle van aquí como carpetas legibles (`detalle-caso`, `builder`,
   `detalle-grupo`, `detalle-recurso`). Renómbralas a `[id]` al montarlas como rutas dinámicas.
5. Instala `recharts` si usas **studio/admin/analitica** (es la única pantalla que lo requiere).

## Estructura

```
campus-lxp-mocks/
├── globals.css                 ← tokens: color, tipografía, geometría, 3 temas de lectura
├── components/                 ← lo que se repetía en varias pantallas, ya extraído
│   ├── tokens.ts               mono · kicker · softText · card · focusRing · TONO
│   ├── Avatar.tsx              Avatar (palomita = docente) · AvatarStack
│   ├── Button.tsx              alturas 36/44/48 · variante invertida (una por pantalla)
│   ├── Chip.tsx                Chip por tono semántico · Tag neutro
│   ├── EcoMark.tsx             marca de Eco (ondas) · EcoNota de autoría
│   ├── EmptyState.tsx          vacío con motivo y siguiente paso
│   ├── LoopThumb.tsx           marco de cine-loop / DICOM (visor real: Cornerstone3D)
│   ├── ProgressBar.tsx         ProgressBar · ProgressRow
│   ├── SectionHeader.tsx       encabezado de sección · Kicker
│   ├── StatCard.tsx            cifra + unidad + señal accionable
│   └── index.ts
├── alumno/
│   ├── login/                  passwordless descartado: correo + contraseña, recuperar
│   ├── shell-menus/            layout persistente: sidebar navy agrupado + topbar
│   ├── home/                   hero inteligente · retomar · comunidad · semana
│   ├── cursos/                 mis cursos inscritos  (+ explorar/ = catálogo)
│   ├── leccion-lectura/        sala de estudio: video/lectura + MODO LECTURA (3 temas)
│   ├── bitacora/               sus casos de práctica + sheet de subida
│   ├── ateneo/                 muro de la comunidad  (+ detalle-caso/)
│   ├── biblioteca-casos/       acervo curado, filtrado a fondo  (+ detalle-caso/)
│   ├── simuladores/            entrenadores de interpretación y reporte
│   ├── calculadoras/           catálogo + calculadora individual
│   ├── reportes/               generador de reportes clínicos
│   ├── dominio/                competencia I-AIM, decaimiento y repaso
│   └── certificados/           obtenidos y en progreso
└── studio/
    ├── disenador/              layout con navegación en el header (sin sidebar)
    │   ├── home/               noticias, KPIs y pulso del Ateneo
    │   ├── programas/          lista + builder/ (course builder con versionado)
    │   ├── grupos/             instancias + detalle-grupo/ (heredado vs override)
    │   ├── contenido/          biblioteca de recursos + detalle-recurso/ (dónde se usa)
    │   ├── casos/              curaduría del banco (de alumno / staff)
    │   ├── editor-caso/        estación de autoría: visor + verdad del caso
    │   └── herramientas/       plantillas · calculadoras · simuladores
    ├── docente/
    │   ├── dashboard/          bandeja de trabajo con Eco integrado
    │   ├── validacion/         valida casos: Eco propone, el docente firma
    │   ├── entregas/           autoevaluaciones automáticas + tareas pre-calificadas
    │   ├── consultas/          canal 1:1 con el alumno, con borradores de Eco
    │   ├── grupos/             seguimiento de sus grupos y alumnos
    │   ├── recursos/           su cajón personal de material
    │   └── clases/             agenda Zoom / MiCo+ y grabaciones
    └── admin/
        ├── dashboard/          centro de control: negocio · sistema · atención
        ├── configuracion/      hub de las 9 áreas de gobierno
        ├── analitica/          negocio · aprendizaje (LRS) · operación + Eco analista
        ├── anuncios/           gestor de la comunicación oficial (3 roles)
        ├── alumnos/            padrón (fuente de verdad: CORA, solo lectura)
        └── staff/              carga y capacidad de respuesta del equipo
```

## Reglas del sistema que sostienen los mocks

- **Un solo color de atención por pantalla.** Ámbar para lo que requiere acción; **rojo solo**
  para dinero vencido o integración caída. El violeta es **Eco** e informa, nunca alarma.
- **Eco propone, la persona confirma.** Ninguna nota, validación ni anuncio se asienta solo.
- **CORA es la fuente de verdad** de alumnos, inscripciones y cobranza: aquí se consulta en
  solo lectura y se declara con candado.
- **Alturas y targets:** 44px normal, 48px el CTA principal (uno por pantalla).
- **Geometría:** 12px tarjetas · 10px controles · 999px chips y barras · 16px heroes.
  Sombra única de reposo: `0 1px 3px rgba(17,24,39,.06)`.
- **Contenido a 1240px centrado**; login y heroes son full-bleed.

## Pendiente

- **studio/admin/grupos** y **studio/admin/programas**: el admin los consulta con su propio
  alcance, pero la pantalla diseñada es la del diseñador instruccional
  (`studio/disenador/grupos` y `/programas`). Reutilízalas con el rol como prop mientras se
  diseña la vista de gobierno.
- Los visores DICOM son **placeholders con marco y herramientas**: el visor real es
  **Cornerstone3D**.
- Video: los reproductores están maquetados; la entrega real va por **Cloudflare Stream**.
