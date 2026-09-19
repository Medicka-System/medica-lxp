import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Statement } from '@campus/shared';
import { DbService } from '../db/db.service';
import { CompetenciaService } from '../competencia/competencia.service';
import { XapiService } from '../xapi/xapi.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { BadRequestException } from '@nestjs/common';
import { ValidacionService } from './validacion.service';
import { ValidacionController } from './validacion.controller';
import * as repo from './validacion.repositorio';

// El servicio es ORQUESTACIÓN: mockeamos el repositorio (DB) y verificamos las
// side-effects de dominio (competencia + xAPI). Así el test no toca Postgres.
jest.mock('./validacion.repositorio', () => ({
  cargarCasoValidacion: jest.fn(),
  registrarValidacion: jest.fn(),
}));

const cargar = repo.cargarCasoValidacion as jest.Mock;
const registrar = repo.registrarValidacion as jest.Mock;

describe('ValidacionService (flujo de validación del docente)', () => {
  const competencia = { recalcular: jest.fn() };
  const xapi = { encolar: jest.fn() };
  const notif = { encolar: jest.fn() };
  const db = { sql: {} };

  async function crear(): Promise<ValidacionService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ValidacionService,
        { provide: DbService, useValue: db },
        { provide: CompetenciaService, useValue: competencia },
        { provide: XapiService, useValue: xapi },
        { provide: NotificacionesService, useValue: notif },
      ],
    }).compile();
    return moduleRef.get(ValidacionService);
  }

  beforeEach(() => {
    competencia.recalcular.mockResolvedValue('comp-job-1');
    xapi.encolar.mockResolvedValue('xapi-job');
    notif.encolar.mockResolvedValue('notif-job');
    registrar.mockResolvedValue({ validacionId: 'val-1' });
  });

  afterEach(() => jest.clearAllMocks());

  /** Verbos de los statements encolados, en orden. */
  function verbosEncolados(): string[] {
    return xapi.encolar.mock.calls.map(
      ([st]: [Statement]) => st.verb.id,
    );
  }

  it('aprobar: asienta la validación, recalcula competencia y emite xAPI (validó + aprobó)', async () => {
    cargar.mockResolvedValue({
      id: 'caso-1',
      id_alumno: 'alumno-1',
      estado_validacion: 'pendiente',
    });
    const svc = await crear();

    const res = await svc.aprobar('caso-1', 'docente-1', 'buen caso');

    expect(registrar).toHaveBeenCalledWith(db.sql, {
      casoId: 'caso-1',
      docenteId: 'docente-1',
      decision: 'aprobado',
      feedback: 'buen caso',
      correccionSobreEco: undefined,
    });
    // Al aprobar SÍ se recalcula competencia del alumno del caso (no del docente).
    expect(competencia.recalcular).toHaveBeenCalledWith('alumno-1');
    expect(res.competenciaJobId).toBe('comp-job-1');
    expect(res).toMatchObject({
      validacionId: 'val-1',
      casoId: 'caso-1',
      alumnoId: 'alumno-1',
      decision: 'aprobado',
    });
    // xAPI: docente validó (success) + alumno aprobó.
    const verbos = verbosEncolados();
    expect(verbos.some((v) => v.endsWith('/verbs/valido'))).toBe(true);
    expect(verbos.some((v) => v.endsWith('/verbs/passed'))).toBe(true);
    expect(xapi.encolar).toHaveBeenCalledTimes(2);
    // Notifica al alumno el caso aprobado (§8 job #12).
    expect(notif.encolar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'alumno-1', tipo: 'caso_validado' }),
    );
  });

  it('la corrección sobre Eco viaja al repositorio (loop de mejora §7A)', async () => {
    cargar.mockResolvedValue({
      id: 'caso-1',
      id_alumno: 'alumno-1',
      estado_validacion: 'pendiente',
    });
    const svc = await crear();

    await svc.aprobar('caso-1', 'docente-1', undefined, { nota: { de: 6, a: 8 } });

    expect(registrar).toHaveBeenCalledWith(
      db.sql,
      expect.objectContaining({ correccionSobreEco: { nota: { de: 6, a: 8 } } }),
    );
  });

  it('rechazar: registra la decisión y emite xAPI (validó + falló), SIN recalcular competencia', async () => {
    cargar.mockResolvedValue({
      id: 'caso-2',
      id_alumno: 'alumno-2',
      estado_validacion: 'pendiente',
    });
    const svc = await crear();

    const res = await svc.rechazar('caso-2', 'docente-1', 'imagen no diagnóstica');

    expect(registrar).toHaveBeenCalledWith(
      db.sql,
      expect.objectContaining({ decision: 'rechazado' }),
    );
    expect(competencia.recalcular).not.toHaveBeenCalled();
    expect(res.competenciaJobId).toBeUndefined();
    const verbos = verbosEncolados();
    expect(verbos.some((v) => v.endsWith('/verbs/valido'))).toBe(true);
    expect(verbos.some((v) => v.endsWith('/verbs/failed'))).toBe(true);
    // Notifica al alumno el caso rechazado, con el feedback (§8 job #12).
    expect(notif.encolar).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'alumno-2',
        tipo: 'caso_rechazado',
        datos: { feedback: 'imagen no diagnóstica' },
      }),
    );
  });

  it('caso inexistente: 404 y ninguna side-effect', async () => {
    cargar.mockResolvedValue(null);
    const svc = await crear();

    await expect(svc.aprobar('no-existe', 'docente-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(registrar).not.toHaveBeenCalled();
    expect(competencia.recalcular).not.toHaveBeenCalled();
    expect(xapi.encolar).not.toHaveBeenCalled();
  });
});

describe('ValidacionController', () => {
  const validacion = {
    aprobar: jest.fn().mockResolvedValue({ validacionId: 'v1', decision: 'aprobado' }),
    rechazar: jest.fn().mockResolvedValue({ validacionId: 'v2', decision: 'rechazado' }),
  };

  async function crear(): Promise<ValidacionController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValidacionController],
      providers: [{ provide: ValidacionService, useValue: validacion }],
    }).compile();
    return moduleRef.get(ValidacionController);
  }

  afterEach(() => jest.clearAllMocks());

  it('POST aprobar delega en el servicio con el casoId de la ruta', async () => {
    const ctrl = await crear();
    await ctrl.aprobar('caso-9', { docenteId: 'doc-1', feedback: 'ok' });
    expect(validacion.aprobar).toHaveBeenCalledWith('caso-9', 'doc-1', 'ok', undefined);
  });

  it('exige docenteId (400 si falta)', async () => {
    const ctrl = await crear();
    // El guard lanza síncronamente, antes de devolver la promesa.
    expect(() => ctrl.aprobar('caso-9', {})).toThrow(BadRequestException);
    expect(validacion.aprobar).not.toHaveBeenCalled();
  });
});
