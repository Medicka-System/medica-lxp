#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conversor Fase 2: plantillas reales (.docx) → lxp.plantillas_reporte.estructura (jsonb).
Emite packages/db/src/plantillas-reales.json que el seed inserta. NO se commitea el script.

Enfoque (acordado):
  · Familia A (narrativas): encabezado estándar + Técnica/Hallazgos como MULTITEXTO con el
    boilerplate VERBATIM (valorDefecto, los xx/___ intactos) + galería. Impresión → impresionDefecto.
  · Familia B (obstétrico/pélvico): tablas de medición → `tabla`; resto del formulario
    (checkboxes) → multitexto verbatim; + encabezado + galería.
  · Ejemplos ya llenados (varias jpeg): se usa SOLO la estructura (Hallazgos default vacío).
"""
import sys, io, os, re, glob, hashlib, json
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'campus-lxp-mocks', 'Plantillas de reportes')
SRC = os.path.abspath(SRC)
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'plantillas-reales.ts'))

def cuenta_checkboxes(path):
    """Familia B = formularios con muchas casillas. Detecta ☐/☑ literales + símbolos
    Wingdings de casilla (F0A8/F06F/F0A9) + campos de formulario legacy (w:checkBox)."""
    import zipfile
    xml = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8', 'ignore')
    n = 0
    n += len(re.findall(r'[☐☑☒□]', xml))       # ☐ ☑ ☒ □
    n += len(re.findall(r'w:char="F0(?:A8|A9|6F)"', xml, re.I))    # Wingdings casilla
    n += len(re.findall(r'<w:checkBox', xml))                       # form field legacy
    return n
# Near-dups / versiones redundantes a descartar además de los hash-idénticos.
DROP = {
    'Reportes_Ginecológico I.docx',            # ejemplo lleno; el blank Ginecológico lo cubre
    'Reportes_ultrasonido_Doppler Obstétrico.docx',  # dup de Reportes_Doppler Obstétrico
    'USDG_Obst_5-10.6 sem. (2) (1).docx',      # near-dup (mismo contenido que "(2)")
}

# ── encabezado estándar del sistema (mismos ids que el motor) ──
def encabezado():
    return {
        'id': 'enc', 'tipo': 'encabezado', 'titulo': 'Datos del estudio', 'columnas': 3,
        'campos': [
            {'id': 'paciente', 'tipo': 'texto', 'nombre': 'Paciente'},
            {'id': 'edad', 'tipo': 'numero', 'nombre': 'Edad', 'span': 1},
            {'id': 'sexo', 'tipo': 'opcion', 'nombre': 'Sexo', 'opciones': ['Masculino', 'Femenino'], 'span': 1},
            {'id': 'expediente', 'tipo': 'texto', 'nombre': 'Expediente', 'span': 1, 'bloqueado': True},
            {'id': 'fechaEstudio', 'tipo': 'fecha', 'nombre': 'Fecha del estudio', 'span': 1},
            {'id': 'solicitante', 'tipo': 'texto', 'nombre': 'Médico solicitante', 'span': 1},
            {'id': 'equipo', 'tipo': 'texto', 'nombre': 'Equipo', 'span': 1},
            {'id': 'motivo', 'tipo': 'texto', 'nombre': 'Motivo del estudio', 'span': 99},
        ],
    }

def galeria():
    return {
        'id': 's_gal', 'tipo': 'hallazgos', 'titulo': 'Imágenes del estudio', 'columnas': 1,
        'campos': [{'id': 'c_galeria', 'tipo': 'galeria', 'nombre': 'Imágenes del estudio'}],
    }

# ── extracción ──
def texto_lineas(doc):
    """Todas las líneas de texto en orden del cuerpo, incluidas las de tablas."""
    out = []
    body = doc.element.body
    for child in body.iterchildren():
        if child.tag == qn('w:p'):
            t = Paragraph(child, doc).text.strip()
            if t:
                out.append(t)
        elif child.tag == qn('w:tbl'):
            tbl = Table(child, doc)
            for row in tbl.rows:
                celdas = [c.text.strip() for c in row.cells]
                # colapsa celdas repetidas (merged) y une por " | "
                vistas, limpio = set(), []
                for c in celdas:
                    if c and c not in vistas:
                        vistas.add(c); limpio.append(c)
                if limpio:
                    out.append(' | '.join(limpio) if len(limpio) > 1 else limpio[0])
    return out

def cuenta_jpeg(path):
    import zipfile
    z = zipfile.ZipFile(path)
    return sum(1 for n in z.namelist() if re.search(r'media/.*\.jpe?g$', n, re.I))

def nombre_y_tipo(fname):
    base = re.sub(r'\.docx$', '', fname)
    base = re.sub(r'\s*\(\d+\)\s*', ' ', base)          # quita sufijos (2)
    base = re.sub(r'^Reportes?_?', '', base)
    base = base.replace('_', ' ').strip()
    base = re.sub(r'\s+', ' ', base)
    nombre = base[:1].upper() + base[1:]
    low = fname.lower()
    if 'doppler' in low: tipo = 'Doppler'
    elif 'obst' in low or 'usg_obst' in low or 'usdg' in low: tipo = 'Obstétrico'
    elif 'pélvic' in low or 'pelvic' in low or 'ginec' in low: tipo = 'Pélvico'
    elif 'mama' in low: tipo = 'Mama'
    elif 'tiroid' in low or 'cuello' in low: tipo = 'Tiroideo'
    elif 'riñ' in low or 'urinar' in low or 'renal' in low or 'vesico' in low: tipo = 'Renal'
    elif any(k in low for k in ['hombro', 'rodilla', 'brazo', 'antebrazo', 'pared']): tipo = 'MSK'
    else: tipo = 'Abdominal'
    return nombre, tipo

# ── Familia A ──
ANCLA_TEC = re.compile(r'^\s*t[eé]cnica\s*:?', re.I)
ANCLA_HALL = re.compile(r'^\s*hallazgos\s*:?', re.I)
ANCLA_IMP = re.compile(r'^\s*(impresi[oó]n(\s+diagn[oó]stica)?|conclusi[oó]n(es)?)\s*:?', re.I)

def convertir_A(doc, filled):
    lineas = texto_lineas(doc)
    i_tec = i_hall = i_imp = None
    for idx, ln in enumerate(lineas):
        if i_tec is None and ANCLA_TEC.match(ln): i_tec = idx
        elif i_hall is None and ANCLA_HALL.match(ln): i_hall = idx
        elif i_imp is None and ANCLA_IMP.match(ln): i_imp = idx

    def bloque(a, b):
        if a is None: return ''
        seg = lineas[a:(b if b is not None else len(lineas))]
        # quita la etiqueta del ancla en la primera línea
        if seg:
            seg = seg[:]
            seg[0] = re.sub(r'^\s*[^:]{0,28}:\s*', '', seg[0]).strip()
            if not seg[0]:
                seg = seg[1:]
        return '\n'.join(seg).strip()

    tecnica = bloque(i_tec, i_hall if i_hall is not None else i_imp)
    hallazgos = bloque(i_hall, i_imp)
    impresion = bloque(i_imp, None)

    # Si no hubo ancla de Hallazgos, todo el cuerpo (tras encabezado) es la narrativa.
    if i_hall is None and i_tec is None:
        cuerpo = '\n'.join(lineas).strip()
        hallazgos = cuerpo

    secciones = [encabezado()]
    if tecnica:
        secciones.append({
            'id': 's_tec', 'tipo': 'hallazgos', 'titulo': 'Técnica', 'columnas': 1,
            'campos': [{'id': 'c_tec', 'tipo': 'multitexto', 'nombre': 'Técnica',
                        'valorDefecto': tecnica}],
        })
    secciones.append({
        'id': 's_hall', 'tipo': 'hallazgos', 'titulo': 'Hallazgos', 'columnas': 1,
        'campos': [{'id': 'c_hall', 'tipo': 'multitexto', 'nombre': 'Hallazgos del estudio',
                    **({} if filled else {'valorDefecto': hallazgos})}],
    })
    secciones.append(galeria())
    est = {'secciones': secciones}
    if impresion and not filled:
        est['impresionDefecto'] = impresion
    return est

# ── Familia B ──
def es_grid_medicion(tbl):
    if len(tbl.rows) < 2 or len(tbl.columns) < 2:
        return False
    return True

def tabla_medicion_dominio(tipo, fname):
    """Tabla de medición LIMPIA por dominio (las del .docx están mal formadas: celdas
    combinadas, maquetación). Estructura estándar del estudio para que el médico la llene."""
    low = fname.lower()
    if 'obst' in low or tipo == 'Obstétrico':
        return {'titulo': 'Biometría fetal', 'nombre': 'Biometría',
                'columnas': ['Medida (mm)', 'Percentil', 'Comentario'],
                'filas': ['DBP', 'DOF', 'Circunferencia cefálica', 'Circunferencia abdominal',
                          'Longitud femoral', 'ILA / bolsillo mayor']}
    # pélvico / ginecológico
    return {'titulo': 'Mediciones', 'nombre': 'Mediciones',
            'columnas': ['Longitudinal (mm)', 'AP (mm)', 'Transverso (mm)', 'Volumen (cc)'],
            'filas': ['Útero', 'Endometrio', 'Ovario derecho', 'Ovario izquierdo']}

def convertir_B(doc, tipo, fname):
    # Formulario COMPLETO verbatim (conserva ☐ y todas las líneas): el médico lo llena.
    form = '\n'.join(texto_lineas(doc)).strip()
    tm = tabla_medicion_dominio(tipo, fname)
    secciones = [
        encabezado(),
        {'id': 's_med', 'tipo': 'hallazgos', 'titulo': tm['titulo'], 'columnas': 1,
         'campos': [{'id': 'c_med', 'tipo': 'tabla', 'nombre': tm['nombre'],
                     'columnas': tm['columnas'], 'filas': tm['filas']}]},
        {'id': 's_form', 'tipo': 'hallazgos', 'titulo': 'Formulario y hallazgos', 'columnas': 1,
         'campos': [{'id': 'c_form', 'tipo': 'multitexto', 'nombre': 'Estudio y hallazgos',
                     **({'valorDefecto': form} if form else {})}]},
        galeria(),
    ]
    return {'secciones': secciones}

# ── main ──
def main():
    archivos = sorted(glob.glob(os.path.join(SRC, '*.docx')))
    vistos_hash = {}
    plantillas = []
    descartados = []
    for path in archivos:
        fname = os.path.basename(path)
        if fname in DROP:
            descartados.append((fname, 'drop-explícito')); continue
        data = open(path, 'rb').read()
        # hash del document.xml (ignora metadatos de zip)
        import zipfile
        try:
            docxml = zipfile.ZipFile(path).read('word/document.xml')
        except Exception:
            descartados.append((fname, 'sin document.xml')); continue
        h = hashlib.md5(docxml).hexdigest()
        if h in vistos_hash:
            descartados.append((fname, f'dup de {vistos_hash[h]}')); continue
        vistos_hash[h] = fname

        doc = Document(path)
        nombre, tipo = nombre_y_tipo(fname)
        filled = cuenta_jpeg(path) > 1
        if cuenta_checkboxes(path) >= 8:
            est = convertir_B(doc, tipo, fname); familia = 'B'
        else:
            est = convertir_A(doc, filled); familia = 'A'
        plantillas.append({'archivo': fname, 'nombre': nombre, 'tipo': tipo,
                           'familia': familia, 'filled': filled, 'estructura': est})

    # Carótida (.potx): a mano
    plantillas.append({
        'archivo': 'Plantilla_Carotida.potx', 'nombre': 'Doppler carotídeo', 'tipo': 'Doppler',
        'familia': 'C', 'filled': False,
        'estructura': {
            'secciones': [
                encabezado(),
                {'id': 's_ref', 'tipo': 'hallazgos', 'titulo': 'Referencia anatómica', 'columnas': 1,
                 'campos': [{'id': 'c_ref', 'tipo': 'imagen', 'nombre': 'Diagrama de troncos supraaórticos',
                             'origen': 'referencia', 'refUrl': ''},
                            {'id': 'c_guia', 'tipo': 'guia',
                             'nombre': 'Reporte los índices por vaso (ACC, ACE, ACI) de cada lado.'}]},
                {'id': 's_der', 'tipo': 'hallazgos', 'titulo': 'Doppler carotídeo derecho', 'columnas': 1,
                 'campos': [{'id': 'c_tder', 'tipo': 'tabla', 'nombre': 'Velocidades e índices (derecho)',
                             'columnas': ['PSV (cm/s)', 'EDV (cm/s)', 'IR', 'Estenosis (%)'],
                             'filas': ['ACC', 'ACE', 'ACI', 'Vertebral']}]},
                {'id': 's_izq', 'tipo': 'hallazgos', 'titulo': 'Doppler carotídeo izquierdo', 'columnas': 1,
                 'campos': [{'id': 'c_tizq', 'tipo': 'tabla', 'nombre': 'Velocidades e índices (izquierdo)',
                             'columnas': ['PSV (cm/s)', 'EDV (cm/s)', 'IR', 'Estenosis (%)'],
                             'filas': ['ACC', 'ACE', 'ACI', 'Vertebral']}]},
                {'id': 's_int', 'tipo': 'hallazgos', 'titulo': 'Interpretación', 'columnas': 1,
                 'campos': [{'id': 'c_int', 'tipo': 'multitexto', 'nombre': 'Hallazgos e interpretación'}]},
                galeria(),
            ],
            'impresionDefecto': '',
        },
    })

    datos = [{'nombre': p['nombre'], 'tipo': p['tipo'], 'estructura': p['estructura']} for p in plantillas]
    cuerpo = json.dumps(datos, ensure_ascii=False, indent=2)
    ts = (
        '// GENERADO por scripts/convert_plantillas.py — NO editar a mano.\n'
        '// Plantillas de reporte reales (Fase 2) convertidas de campus-lxp-mocks/Plantillas de reportes.\n'
        'export type PlantillaReal = { nombre: string; tipo: string; estructura: unknown };\n\n'
        f'export const PLANTILLAS_REALES: PlantillaReal[] = {cuerpo};\n'
    )
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(ts)

    print(f'✓ {len(plantillas)} plantillas → {OUT}')
    print(f'  Descartados ({len(descartados)}):')
    for fn, why in descartados:
        print(f'   - {fn}  [{why}]')
    print('  Por familia:', {k: sum(1 for p in plantillas if p["familia"] == k) for k in ('A', 'B', 'C')})
    print('  Rellenados (solo estructura):', [p['archivo'] for p in plantillas if p['filled']])

if __name__ == '__main__':
    main()
