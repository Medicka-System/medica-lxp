import {
  detectarResync,
  existeEntidad,
  resolverHerencia,
  validarPatch,
} from './herencia.logic';
import type { OverrideCrudo, ProgramaTpl } from './herencia.types';

/** Plantilla mínima con 2 módulos, lecciones, contenido y actividad. */
function plantilla(version = 1): ProgramaTpl {
  return {
    id: 'p1',
    nombre: 'POCUS Esencial',
    descripcion: 'Plantilla viva',
    version,
    publicado: true,
    modulos: [
      {
        id: 'm1',
        nombre: 'Fundamentos',
        descripcion: null,
        orden: 1,
        horas: 8,
        lecciones: [
          {
            id: 'l1',
            nombre: 'Principios',
            descripcion: null,
            orden: 1,
            contenidos: [
              {
                id: 'c1',
                tipo: 'video',
                titulo: 'Cómo se forma la imagen',
                recurso_ref: null,
                cuerpo: null,
                orden: 1,
              },
            ],
            actividades: [
              {
                id: 'act1',
                tipo: 'tarea',
                titulo: 'Identifica planos',
                instrucciones: 'Sube 3 imágenes.',
                orden: 1,
              },
            ],
          },
        ],
      },
      {
        id: 'm2',
        nombre: 'Abdomen y FAST',
        descripcion: null,
        orden: 2,
        horas: 12,
        lecciones: [],
      },
    ],
  };
}

describe('validarPatch (protege la plantilla)', () => {
  it('deja pasar solo las claves permitidas y reporta las rechazadas', () => {
    const r = validarPatch('modulo', {
      nombre: 'Nuevo nombre',
      horas: 10,
      id: 'hack', // estructural → rechazado
      programa_id: 'x', // estructural → rechazado
    });
    expect(r.limpio).toEqual({ nombre: 'Nuevo nombre', horas: 10 });
    expect(r.rechazadas.sort()).toEqual(['id', 'programa_id']);
    expect(r.oculto).toBe(false);
  });

  it('extrae `oculto` a la meta, no al patch de datos', () => {
    const r = validarPatch('leccion', { oculto: true, nombre: 'x' });
    expect(r.oculto).toBe(true);
    expect(r.limpio).toEqual({ nombre: 'x' });
  });
});

describe('resolverHerencia', () => {
  it('sin overrides: todo heredado y estructura intacta', () => {
    const v = resolverHerencia(plantilla(), []);
    expect(v.programa.herencia.personalizado).toBe(false);
    expect(v.modulos).toHaveLength(2);
    expect(v.modulos[0]?.herencia.personalizado).toBe(false);
    expect(v.modulos[0]?.lecciones[0]?.contenidos).toHaveLength(1);
    expect(v.modulos[0]?.lecciones[0]?.actividades[0]?.titulo).toBe(
      'Identifica planos',
    );
    expect(v.resumen).toEqual({
      modulos: 2,
      lecciones: 1,
      personalizaciones: 0,
      ocultos: 0,
    });
    expect(v.resync).toEqual([]);
  });

  it('un override de nombre marca solo ese nodo como personalizado', () => {
    const overrides: OverrideCrudo[] = [
      {
        entidad: 'modulo',
        entidad_id: 'm1',
        patch: { nombre: 'Fundamentos (grupo A)' },
        aplicado_sobre_version: 1,
      },
    ];
    const v = resolverHerencia(plantilla(), overrides);
    const m1 = v.modulos.find((m) => m.id === 'm1');
    const m2 = v.modulos.find((m) => m.id === 'm2');
    expect(m1?.nombre).toBe('Fundamentos (grupo A)');
    expect(m1?.herencia.personalizado).toBe(true);
    expect(m1?.herencia.camposPersonalizados).toEqual(['nombre']);
    expect(m2?.herencia.personalizado).toBe(false); // el resto sigue heredado
    expect(v.resumen.personalizaciones).toBe(1);
  });

  it('NO muta la plantilla de entrada (un override no rompe la plantilla)', () => {
    const original = plantilla();
    const snapshot = JSON.parse(JSON.stringify(original));
    resolverHerencia(original, [
      {
        entidad: 'modulo',
        entidad_id: 'm1',
        patch: { nombre: 'Otro nombre', oculto: true },
        aplicado_sobre_version: 1,
      },
    ]);
    expect(original).toEqual(snapshot); // intacta
  });

  it('un patch con claves no permitidas no altera el nodo', () => {
    const v = resolverHerencia(plantilla(), [
      {
        entidad: 'contenido',
        entidad_id: 'c1',
        patch: { id: 'otro', recurso_ref: 'https://cdn/x' },
        aplicado_sobre_version: 1,
      },
    ]);
    const c1 = v.modulos[0]?.lecciones[0]?.contenidos[0];
    expect(c1?.id).toBe('c1'); // id estructural intacto
    expect(c1?.recurso_ref).toBe('https://cdn/x'); // campo permitido sí aplica
    expect(c1?.herencia.camposPersonalizados).toEqual(['recurso_ref']);
  });

  it('ocultar una lección la marca sin sacarla del árbol', () => {
    const v = resolverHerencia(plantilla(), [
      {
        entidad: 'leccion',
        entidad_id: 'l1',
        patch: { oculto: true },
        aplicado_sobre_version: 1,
      },
    ]);
    const l1 = v.modulos[0]?.lecciones[0];
    expect(l1?.herencia.oculto).toBe(true);
    expect(l1?.herencia.personalizado).toBe(true);
    expect(v.resumen.ocultos).toBe(1);
  });

  it('reordena los hijos según el `orden` personalizado', () => {
    const base = plantilla();
    // dos contenidos en l1 para probar el reorden
    base.modulos[0]!.lecciones[0]!.contenidos.push({
      id: 'c2',
      tipo: 'texto',
      titulo: 'Lectura',
      recurso_ref: null,
      cuerpo: 'x',
      orden: 2,
    });
    const v = resolverHerencia(base, [
      {
        entidad: 'contenido',
        entidad_id: 'c2',
        patch: { orden: 0 }, // lo manda al frente
        aplicado_sobre_version: 1,
      },
    ]);
    const ids = v.modulos[0]?.lecciones[0]?.contenidos.map((c) => c.id);
    expect(ids).toEqual(['c2', 'c1']);
  });

  it('un valor igual al de la plantilla no cuenta como personalización', () => {
    const v = resolverHerencia(plantilla(), [
      {
        entidad: 'modulo',
        entidad_id: 'm1',
        patch: { nombre: 'Fundamentos' }, // idéntico
        aplicado_sobre_version: 1,
      },
    ]);
    const m1 = v.modulos.find((m) => m.id === 'm1');
    expect(m1?.herencia.personalizado).toBe(false);
    expect(v.resumen.personalizaciones).toBe(0);
  });
});

describe('detectarResync (aviso de re-sincronización)', () => {
  it('marca huérfano cuando la entidad ya no existe en la plantilla', () => {
    const avisos = detectarResync(plantilla(2), [
      {
        entidad: 'leccion',
        entidad_id: 'borrada',
        patch: { nombre: 'x' },
        aplicado_sobre_version: 2,
      },
    ]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.motivo).toBe('huerfano');
  });

  it('marca desfasado cuando la plantilla avanzó de versión', () => {
    const avisos = detectarResync(plantilla(3), [
      {
        entidad: 'modulo',
        entidad_id: 'm1',
        patch: { nombre: 'x' },
        aplicado_sobre_version: 1,
      },
    ]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      motivo: 'desfasado',
      aplicado_sobre_version: 1,
      version_actual: 3,
    });
  });

  it('no marca nada cuando el override está al día y la entidad existe', () => {
    expect(
      detectarResync(plantilla(2), [
        {
          entidad: 'modulo',
          entidad_id: 'm1',
          patch: { nombre: 'x' },
          aplicado_sobre_version: 2,
        },
      ]),
    ).toEqual([]);
  });
});

describe('existeEntidad', () => {
  it('reconoce ids presentes y ausentes por entidad', () => {
    const p = plantilla();
    expect(existeEntidad(p, 'modulo', 'm1')).toBe(true);
    expect(existeEntidad(p, 'actividad', 'act1')).toBe(true);
    expect(existeEntidad(p, 'contenido', 'noexiste')).toBe(false);
    expect(existeEntidad(p, 'programa', 'p1')).toBe(true);
  });
});

// ── Contenido PROPIO del grupo (Opción 1A · merge aditivo · Etapa 2) ──────────────
describe('resolverHerencia · contenido propio del grupo (merge)', () => {
  it('sin propias: comportamiento IDÉNTICO + todo marcado origen heredado', () => {
    const v = resolverHerencia(plantilla(), []);
    expect(v.modulos).toHaveLength(2);
    expect(v.modulos[0]?.herencia.origen).toBe('heredado');
    expect(v.modulos[0]?.lecciones[0]?.herencia.origen).toBe('heredado');
    expect(v.resumen).toEqual({ modulos: 2, lecciones: 1, personalizaciones: 0, ocultos: 0 });
  });

  it('módulo propio: se fusiona DESPUÉS de su ancla, origen propio, cuenta en el resumen', () => {
    const v = resolverHerencia(plantilla(), [], {
      modulos: [
        {
          id: 'gm1',
          nombre: 'Módulo del grupo',
          descripcion: null,
          orden: 1,
          horas: 2,
          despues_de: 'm1', // entre m1 y m2
          lecciones: [],
        },
      ],
    });
    expect(v.modulos.map((m) => m.id)).toEqual(['m1', 'gm1', 'm2']);
    const gm = v.modulos.find((m) => m.id === 'gm1');
    expect(gm?.herencia.origen).toBe('propio');
    expect(gm?.herencia.personalizado).toBe(false);
    expect(v.resumen.modulos).toBe(3);
  });

  it('módulo propio con despues_de NULL va al INICIO', () => {
    const v = resolverHerencia(plantilla(), [], {
      modulos: [
        { id: 'gm0', nombre: 'Intro del grupo', descripcion: null, orden: 1, horas: 1, despues_de: null, lecciones: [] },
      ],
    });
    expect(v.modulos.map((m) => m.id)).toEqual(['gm0', 'm1', 'm2']);
  });

  it('lección propia bajo un módulo HEREDADO: posición por despues_de, cuenta en lecciones', () => {
    const v = resolverHerencia(plantilla(), [], {
      lecciones: [
        {
          id: 'gl1',
          modulo_id: 'm1',
          despues_de: 'l1', // después de la lección heredada l1
          nombre: 'Lección del grupo',
          descripcion: null,
          orden: 1,
          contenidos: [],
          actividades: [],
        },
      ],
    });
    const m1 = v.modulos.find((m) => m.id === 'm1');
    expect(m1?.lecciones.map((l) => l.id)).toEqual(['l1', 'gl1']);
    const gl = m1?.lecciones.find((l) => l.id === 'gl1');
    expect(gl?.herencia.origen).toBe('propio');
    expect(v.resumen.lecciones).toBe(2); // 1 heredada + 1 propia
  });

  it('bloque propio bajo una lección HEREDADA: se fusiona en sus bloques con origen propio', () => {
    const base = plantilla();
    // la lección heredada l1 estrena bloques (teoría)
    base.modulos[0]!.lecciones[0]!.bloques = [
      { id: 'b1', orden: 1, tipo_bloque: 'texto', config: {} },
    ];
    const v = resolverHerencia(base, [], {
      bloques: [
        { id: 'gb1', leccion_id: 'l1', despues_de: 'b1', orden: 1, tipo_bloque: 'imagen', config: { ref: 'x' } },
      ],
    });
    const l1 = v.modulos[0]?.lecciones.find((l) => l.id === 'l1');
    expect(l1?.bloques?.map((b) => b.id)).toEqual(['b1', 'gb1']);
    expect(l1?.bloques?.find((b) => b.id === 'b1')?.origen).toBe('heredado');
    expect(l1?.bloques?.find((b) => b.id === 'gb1')?.origen).toBe('propio');
  });

  it('bloque propio con reemplaza_a SUPRIME al heredado en su lugar (copy-on-write · Paso 4)', () => {
    const base = plantilla();
    base.modulos[0]!.lecciones[0]!.bloques = [
      { id: 'b1', orden: 1, tipo_bloque: 'texto', config: { html: '<p>programa</p>' } },
      { id: 'b2', orden: 2, tipo_bloque: 'imagen', config: {} },
    ];
    const v = resolverHerencia(base, [], {
      bloques: [
        {
          id: 'gb1',
          leccion_id: 'l1',
          despues_de: null, // b1 era el primero → la copia va al inicio (su lugar)
          orden: 1,
          tipo_bloque: 'texto',
          config: { html: '<p>grupo</p>' },
          reemplaza_a: 'b1',
        },
      ],
    });
    const l1 = v.modulos[0]?.lecciones.find((l) => l.id === 'l1');
    // b1 (heredado) SUPRIMIDO; gb1 (copia) en su posición; b2 sigue heredando.
    expect(l1?.bloques?.map((b) => b.id)).toEqual(['gb1', 'b2']);
    expect(l1?.bloques?.find((b) => b.id === 'b1')).toBeUndefined();
    expect(l1?.bloques?.find((b) => b.id === 'gb1')?.origen).toBe('propio');
    expect(l1?.bloques?.find((b) => b.id === 'b2')?.origen).toBe('heredado');
  });

  it('despues_de a un ancla INEXISTENTE (borrada) cae al inicio del ámbito', () => {
    const v = resolverHerencia(plantilla(), [], {
      modulos: [
        { id: 'gmX', nombre: 'X', descripcion: null, orden: 1, horas: 1, despues_de: 'no-existe', lecciones: [] },
      ],
    });
    expect(v.modulos.map((m) => m.id)).toEqual(['gmX', 'm1', 'm2']);
  });

  it('NO muta la plantilla al fusionar propias', () => {
    const original = plantilla();
    const snapshot = JSON.parse(JSON.stringify(original));
    resolverHerencia(original, [], {
      modulos: [{ id: 'gm', nombre: 'g', descripcion: null, orden: 1, horas: 1, despues_de: 'm1', lecciones: [] }],
      lecciones: [{ id: 'gl', modulo_id: 'm1', despues_de: null, nombre: 'g', descripcion: null, orden: 1, contenidos: [], actividades: [] }],
    });
    expect(original).toEqual(snapshot);
  });

  it('overrides sobre lo heredado conviven con propias (no se mezclan)', () => {
    const v = resolverHerencia(
      plantilla(),
      [{ entidad: 'modulo', entidad_id: 'm1', patch: { nombre: 'Fundamentos (A)' }, aplicado_sobre_version: 1 }],
      { modulos: [{ id: 'gm', nombre: 'Propio', descripcion: null, orden: 1, horas: 1, despues_de: 'm1', lecciones: [] }] },
    );
    const m1 = v.modulos.find((m) => m.id === 'm1');
    const gm = v.modulos.find((m) => m.id === 'gm');
    expect(m1?.nombre).toBe('Fundamentos (A)'); // override aplicado al heredado
    expect(m1?.herencia.origen).toBe('heredado');
    expect(m1?.herencia.personalizado).toBe(true);
    expect(gm?.herencia.origen).toBe('propio');
    expect(gm?.herencia.personalizado).toBe(false); // lo propio no es "personalización"
  });
});
