import { analizarManifiesto } from './manifiesto';

const SCORM_12 = `<?xml version="1.0"?>
<manifest identifier="MI-CURSO-123" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>Ecografía POCUS · Módulo 1</title>
      <item identifier="ITEM-1" identifierref="RES-1"><title>Lección 1</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html">
      <file href="index_lms.html"/>
    </resource>
  </resources>
</manifest>`;

const SCORM_2004 = `<?xml version="1.0"?>
<manifest identifier="CURSO-2004">
  <metadata><schemaversion>2004 3rd Edition</schemaversion></metadata>
  <organizations default="O">
    <organization identifier="O"><title>Doppler avanzado</title></organization>
  </organizations>
  <resources>
    <resource identifier="R" href="story.html"/>
  </resources>
</manifest>`;

const TINCAN = `<?xml version="1.0" encoding="utf-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="http://medica.mx/curso/abc" type="http://adlnet.gov/expapi/activities/course">
      <name>Interpretación de hallazgos</name>
      <description lang="es-MX">Curso xAPI</description>
      <launch lang="es-MX">index.html</launch>
    </activity>
  </activities>
</tincan>`;

describe('analizarManifiesto (SCORM / xAPI · §7)', () => {
  it('detecta SCORM 1.2 con título, entryPoint y versión', () => {
    const r = analizarManifiesto({ imsmanifest: SCORM_12 });
    expect(r.tipo).toBe('scorm');
    expect(r.titulo).toBe('Ecografía POCUS · Módulo 1');
    expect(r.entryPoint).toBe('index_lms.html');
    expect(r.identificador).toBe('MI-CURSO-123');
    expect(r.version).toBe('1.2');
  });

  it('detecta SCORM 2004 (schemaversion con texto)', () => {
    const r = analizarManifiesto({ imsmanifest: SCORM_2004 });
    expect(r.tipo).toBe('scorm');
    expect(r.titulo).toBe('Doppler avanzado');
    expect(r.entryPoint).toBe('story.html');
    expect(r.version).toContain('2004');
  });

  it('detecta xAPI (tincan.xml) con nombre y launch', () => {
    const r = analizarManifiesto({ tincan: TINCAN });
    expect(r.tipo).toBe('xapi');
    expect(r.titulo).toBe('Interpretación de hallazgos');
    expect(r.entryPoint).toBe('index.html');
    expect(r.identificador).toBe('http://medica.mx/curso/abc');
  });

  it('prioriza SCORM cuando el paquete trae ambos manifiestos', () => {
    const r = analizarManifiesto({ imsmanifest: SCORM_2004, tincan: TINCAN });
    expect(r.tipo).toBe('scorm');
  });

  it('lanza si no hay ningún manifiesto', () => {
    expect(() => analizarManifiesto({})).toThrow(/no contiene/i);
  });

  it('lanza si el imsmanifest no es XML válido', () => {
    expect(() => analizarManifiesto({ imsmanifest: '<<< no xml >>>' })).toThrow();
  });

  it('lanza si el XML no tiene <manifest>', () => {
    expect(() => analizarManifiesto({ imsmanifest: '<otra>cosa</otra>' })).toThrow(/manifest/i);
  });
});
