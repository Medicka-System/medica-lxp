import { describe, it, expect } from 'vitest';
import {
  aplicarSetValue,
  construirPayloadCommit,
  construirRuntimeScript,
  jsonSeguro,
  leerGetValue,
  sembrarCmi,
  type Cmi,
} from './runtime';
import { baseDeLanzador, construirShellHtml, escaparSrcdoc, inyectarBase } from './shell';

describe('acumulador CMI (runtime puro)', () => {
  it('sembrarCmi copia el estado previo en un objeto nuevo (reanudación)', () => {
    const previo = { 'cmi.core.lesson_status': 'incomplete', 'cmi.suspend_data': 'pag=3' };
    const store = sembrarCmi(previo);
    expect(store).toEqual(previo);
    expect(store).not.toBe(previo); // copia, no referencia
    expect(sembrarCmi(null)).toEqual({});
    expect(sembrarCmi(undefined)).toEqual({});
  });

  it('aplicarSetValue guarda como string y confirma "true"', () => {
    const store: Cmi = {};
    expect(aplicarSetValue(store, 'cmi.core.score.raw', 85)).toBe('true');
    expect(store['cmi.core.score.raw']).toBe('85');
    aplicarSetValue(store, 'cmi.core.lesson_status', 'completed');
    expect(store['cmi.core.lesson_status']).toBe('completed');
    aplicarSetValue(store, 'x', null);
    expect(store['x']).toBe('');
  });

  it('leerGetValue devuelve el valor guardado o "" si no existe', () => {
    const store = sembrarCmi({ 'cmi.suspend_data': 'abc' });
    expect(leerGetValue(store, 'cmi.suspend_data')).toBe('abc');
    expect(leerGetValue(store, 'cmi.no.existe')).toBe('');
  });

  it('flujo: reanuda, setea, y el payload de commit lleva el CMI acumulado', () => {
    const store = sembrarCmi({ 'cmi.core.lesson_status': 'incomplete' });
    aplicarSetValue(store, 'cmi.core.lesson_status', 'completed');
    aplicarSetValue(store, 'cmi.core.score.raw', '90');
    const payload = construirPayloadCommit(store, { contenidoId: 'c-1', leccionId: 'l-1', titulo: 'T' });
    expect(payload).toEqual({
      contenidoId: 'c-1',
      leccionId: 'l-1',
      titulo: 'T',
      cmi: { 'cmi.core.lesson_status': 'completed', 'cmi.core.score.raw': '90' },
    });
  });
});

describe('jsonSeguro (anti-breakout de <script>)', () => {
  it('escapa "<" para que "</script>" no rompa el tag', () => {
    const out = jsonSeguro({ s: '</script><b>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });
});

describe('construirRuntimeScript', () => {
  const script = construirRuntimeScript({
    commitUrl: '/scorm/commit',
    contenidoId: 'c-9',
    leccionId: 'l-9',
    titulo: 'Demo',
    cmiPrevio: { 'cmi.suspend_data': 'resume-123' },
  });

  it('expone AMBAS APIs (1.2 y 2004) con sus métodos', () => {
    expect(script).toContain('window.API');
    expect(script).toContain('window.API_1484_11');
    for (const m of ['LMSInitialize', 'LMSFinish', 'LMSGetValue', 'LMSSetValue', 'LMSCommit', 'LMSGetLastError']) {
      expect(script).toContain(m);
    }
    for (const m of ['Initialize', 'Terminate', 'GetValue', 'SetValue', 'Commit', 'GetLastError']) {
      expect(script).toContain(m);
    }
  });

  it('incrusta el ctx (commitUrl + cmiPrevio para reanudar) sin romper el <script>', () => {
    expect(script).toContain('/scorm/commit');
    expect(script).toContain('resume-123');
    expect(script).not.toContain('</script>');
  });
});

describe('shell (armado same-origin)', () => {
  it('inyectarBase inserta <base> tras <head>', () => {
    const html = '<html><head><meta charset="utf-8"></head><body>x</body></html>';
    const out = inyectarBase(html, 'https://s3/p/');
    expect(out).toContain('<head><base href="https://s3/p/">');
    expect(out.indexOf('<base')).toBeLessThan(out.indexOf('<meta'));
  });

  it('inyectarBase sintetiza <head> si no existe', () => {
    expect(inyectarBase('<html><body>x</body></html>', '/p/')).toContain('<head><base href="/p/"></head>');
    expect(inyectarBase('solo texto', '/p/')).toContain('<head><base href="/p/"></head>');
  });

  it('escaparSrcdoc escapa & y comillas dobles', () => {
    expect(escaparSrcdoc('a & "b"')).toBe('a &amp; &quot;b&quot;');
  });

  it('baseDeLanzador devuelve el directorio del entryPoint', () => {
    expect(baseDeLanzador('https://s3/bucket/media/paquetes-extraidos/c1/index.html')).toBe(
      'https://s3/bucket/media/paquetes-extraidos/c1/',
    );
  });

  it('construirShellHtml inserta el runtime y el SCO como srcdoc escapado', () => {
    const html = construirShellHtml({
      runtimeScript: 'window.API={};',
      indexHtmlConBase: '<html><head><base href="/p/"></head><body>"hi"</body></html>',
      titulo: 'Demo',
    });
    expect(html).toContain('<script>window.API={};</script>');
    expect(html).toContain('srcdoc="');
    expect(html).toContain('&quot;hi&quot;'); // comillas del SCO escapadas para el atributo
    expect(html).toContain('<iframe id="sco"');
  });
});
