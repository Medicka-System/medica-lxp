import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Statement } from '@campus/shared';
import { DbService } from '../db/db.service';
import { XapiService } from '../xapi/xapi.service';
import { AteneoService } from './ateneo.service';
import { AteneoController } from './ateneo.controller';
import * as repo from './ateneo.repositorio';

// El servicio es ORQUESTACIÓN: mockeamos el repositorio (DB) y verificamos las
// side-effects de dominio (el sello/publicación emiten xAPI). Sin tocar Postgres.
jest.mock('./ateneo.repositorio', () => ({
  cargarComentario: jest.fn(),
  fijarSelloComentario: jest.fn(),
  cargarPost: jest.fn(),
  moderarPost: jest.fn(),
  cargarCasoPublicable: jest.fn(),
  publicarPostDeCaso: jest.fn(),
}));

const m = repo as jest.Mocked<typeof repo>;

describe('AteneoService (dominio del Ateneo)', () => {
  const xapi = { encolar: jest.fn() };
  const db = { sql: {} };

  async function crear(): Promise<AteneoService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AteneoService,
        { provide: DbService, useValue: db },
        { provide: XapiService, useValue: xapi },
      ],
    }).compile();
    return moduleRef.get(AteneoService);
  }

  beforeEach(() => {
    xapi.encolar.mockResolvedValue('xapi-job');
  });
  afterEach(() => jest.clearAllMocks());

  function verbosEncolados(): string[] {
    return xapi.encolar.mock.calls.map(([st]: [Statement]) => st.verb.id);
  }

  // ── Sello de comentario ──────────────────────────────────────────────────
  it('sellarComentario: marca validado_por y emite xAPI validó', async () => {
    m.cargarComentario.mockResolvedValue({
      id: 'com-1',
      post_id: 'post-1',
      autor_id: 'alumno-9',
      validado_por: null,
    });
    const svc = await crear();

    const res = await svc.sellarComentario('com-1', 'docente-1');

    expect(m.fijarSelloComentario).toHaveBeenCalledWith(db.sql, 'com-1', 'docente-1');
    expect(res).toEqual({ comentarioId: 'com-1', postId: 'post-1', sellado: true });
    expect(verbosEncolados().some((v) => v.endsWith('/verbs/valido'))).toBe(true);
  });

  it('retirar el sello (sellar=false) no emite xAPI', async () => {
    m.cargarComentario.mockResolvedValue({
      id: 'com-1',
      post_id: 'post-1',
      autor_id: 'alumno-9',
      validado_por: 'docente-1',
    });
    const svc = await crear();

    const res = await svc.sellarComentario('com-1', 'docente-1', false);

    expect(m.fijarSelloComentario).toHaveBeenCalledWith(db.sql, 'com-1', null);
    expect(res.sellado).toBe(false);
    expect(xapi.encolar).not.toHaveBeenCalled();
  });

  it('sellarComentario: 404 si no existe', async () => {
    m.cargarComentario.mockResolvedValue(null);
    const svc = await crear();
    await expect(svc.sellarComentario('nope', 'docente-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(m.fijarSelloComentario).not.toHaveBeenCalled();
  });

  // ── Moderación de post ───────────────────────────────────────────────────
  it('moderar: fija el estado y emite validó (success según la decisión)', async () => {
    m.cargarPost.mockResolvedValue({
      id: 'post-2',
      tipo: 'caso',
      estado: 'pendiente',
      autor_id: 'alumno-1',
    });
    const svc = await crear();

    await svc.moderar('post-2', 'docente-1', 'aprobado');

    expect(m.moderarPost).toHaveBeenCalledWith(db.sql, 'post-2', 'aprobado');
    const [st] = xapi.encolar.mock.calls[0] as [Statement];
    expect(st.verb.id).toMatch(/\/verbs\/valido$/);
    expect(st.result?.success).toBe(true);
  });

  // ── Publicar caso validado al feed ───────────────────────────────────────
  const casoOk = {
    id: 'caso-1',
    id_alumno: 'alumno-1',
    estado_validacion: 'aprobado',
    estudio_dicom_ref: 's3://anon/caso-1',
    anonimizado_en: '2026-09-18T00:00:00Z',
    organo: 'FAST',
    dominio_iaim: 'interpretacion',
    hallazgos: 'líquido libre',
    diagnostico_presuntivo: 'Hemoperitoneo',
  };

  it('publicarCaso: crea el post (aprobado+anonimizado) y emite subió', async () => {
    m.cargarCasoPublicable.mockResolvedValue({ ...casoOk });
    m.publicarPostDeCaso.mockResolvedValue({ postId: 'post-nuevo', creado: true });
    const svc = await crear();

    const res = await svc.publicarCaso('caso-1');

    expect(res).toEqual({ postId: 'post-nuevo', casoId: 'caso-1', creado: true });
    // El autor del post y del statement es el ALUMNO dueño del caso.
    const [st] = xapi.encolar.mock.calls[0] as [Statement];
    expect(st.verb.id).toMatch(/\/verbs\/subio$/);
    expect(st.actor.account?.name).toBe('alumno-1');
  });

  it('publicarCaso: idempotente — si ya existía, no re-emite xAPI', async () => {
    m.cargarCasoPublicable.mockResolvedValue({ ...casoOk });
    m.publicarPostDeCaso.mockResolvedValue({ postId: 'post-viejo', creado: false });
    const svc = await crear();

    const res = await svc.publicarCaso('caso-1');

    expect(res.creado).toBe(false);
    expect(xapi.encolar).not.toHaveBeenCalled();
  });

  it('publicarCaso: rechaza un caso NO aprobado (409)', async () => {
    m.cargarCasoPublicable.mockResolvedValue({ ...casoOk, estado_validacion: 'pendiente' });
    const svc = await crear();
    await expect(svc.publicarCaso('caso-1')).rejects.toBeInstanceOf(ConflictException);
    expect(m.publicarPostDeCaso).not.toHaveBeenCalled();
  });

  it('publicarCaso: rechaza un caso SIN anonimizar (§10, 409)', async () => {
    m.cargarCasoPublicable.mockResolvedValue({
      ...casoOk,
      anonimizado_en: null,
    });
    const svc = await crear();
    await expect(svc.publicarCaso('caso-1')).rejects.toBeInstanceOf(ConflictException);
    expect(m.publicarPostDeCaso).not.toHaveBeenCalled();
    expect(xapi.encolar).not.toHaveBeenCalled();
  });

  it('publicarCaso: 404 si el caso no existe', async () => {
    m.cargarCasoPublicable.mockResolvedValue(null);
    const svc = await crear();
    await expect(svc.publicarCaso('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AteneoController (guards)', () => {
  const ateneo = {
    sellarComentario: jest.fn().mockResolvedValue({ sellado: true }),
    moderar: jest.fn().mockResolvedValue({ decision: 'aprobado' }),
    publicarCaso: jest.fn().mockResolvedValue({ creado: true }),
  };

  async function crear(): Promise<AteneoController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [AteneoController],
      providers: [{ provide: AteneoService, useValue: ateneo }],
    }).compile();
    return moduleRef.get(AteneoController);
  }

  afterEach(() => jest.clearAllMocks());

  it('sellar exige docenteId (400)', async () => {
    const ctrl = await crear();
    expect(() => ctrl.sellarComentario('c1', {})).toThrow(BadRequestException);
    expect(ateneo.sellarComentario).not.toHaveBeenCalled();
  });

  it('moderar exige una decisión válida (400)', async () => {
    const ctrl = await crear();
    expect(() =>
      ctrl.moderarPost('p1', { docenteId: 'd1', decision: 'quiza' as never }),
    ).toThrow(BadRequestException);
    expect(ateneo.moderar).not.toHaveBeenCalled();
  });

  it('moderar delega con la decisión de la ruta', async () => {
    const ctrl = await crear();
    await ctrl.moderarPost('p1', { docenteId: 'd1', decision: 'rechazado' });
    expect(ateneo.moderar).toHaveBeenCalledWith('p1', 'd1', 'rechazado');
  });
});
