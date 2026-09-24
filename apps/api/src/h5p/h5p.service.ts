import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  H5PAjaxEndpoint,
  H5PEditor,
  H5PPlayer,
  ContentParameters,
  IContentMetadata,
  IUser,
} from '@lumieducation/h5p-server';
import { DbService } from '../db/db.service';
import { registrarContenidoH5p } from './h5p.repositorio';

// El runtime de H5P se carga PEREZOSAMENTE (build CJS) dentro de `motor()`. Los tests
// mockean `motor()`, así jest nunca carga el árbol ESM de H5P (que rompe su transform).
type H5pLib = typeof import('@lumieducation/h5p-server');

/** Instancias del H5P server (se construyen una sola vez, perezosamente). */
interface Instancias {
  editor: H5PEditor;
  player: H5PPlayer;
  ajax: H5PAjaxEndpoint;
}

/**
 * Monta el H5P server (@lumieducation/h5p-server · §3/§7): almacena los content types
 * y el contenido H5P que produce el editor del web, y lo sirve para reproducir. El
 * storage es de FILESYSTEM (bajo `H5P_DATA_DIR`) — suficiente para un VPS único;
 * migrar a object storage (§3) es cambiar las implementaciones de storage sin tocar
 * este servicio. Al guardar, enlaza el contenido a la lección como `lxp.contenidos`
 * tipo `h5p` (dominio, no proxy de CRUD · §2: aquí vive el H5P server, no un SELECT).
 */
@Injectable()
export class H5pService {
  private readonly logger = new Logger(H5pService.name);
  private readonly dataDir = process.env.H5P_DATA_DIR ?? join(process.cwd(), '.h5p-data');
  private readonly idioma = process.env.H5P_LANG ?? 'es';
  private instancias?: Instancias;
  private lib?: H5pLib;

  constructor(private readonly db: DbService) {}

  /** Carga perezosa del runtime H5P (build CJS). Evita cargar H5P en los tests. */
  private cargarLib(): H5pLib {
    if (!this.lib) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.lib = require('@lumieducation/h5p-server') as H5pLib;
    }
    return this.lib;
  }

  /** Usuario H5P mínimo (el server lo exige para permisos; RBAC real lo da el guard). */
  static usuario(id: string, nombre = 'staff'): IUser {
    return { id, name: nombre, email: `${id}@campus.local`, type: 'local' };
  }

  /** Construye (una sola vez) el editor/player/ajax con storages de filesystem. */
  private motor(): Instancias {
    if (this.instancias) return this.instancias;

    for (const sub of ['libraries', 'content', 'temp']) {
      mkdirSync(join(this.dataDir, sub), { recursive: true });
    }

    const { H5PEditor, H5PPlayer, H5PConfig, H5PAjaxEndpoint, fsImplementations } = this.cargarLib();

    const config = new H5PConfig(new fsImplementations.InMemoryStorage(), {
      baseUrl: process.env.H5P_BASE_URL ?? '/h5p',
    });
    const libraryStorage = new fsImplementations.FileLibraryStorage(join(this.dataDir, 'libraries'));
    const contentStorage = new fsImplementations.FileContentStorage(join(this.dataDir, 'content'));
    const temporaryStorage = new fsImplementations.DirectoryTemporaryFileStorage(
      join(this.dataDir, 'temp'),
    );

    const editor = new H5PEditor(
      new fsImplementations.InMemoryStorage(),
      config,
      libraryStorage,
      contentStorage,
      temporaryStorage,
    );
    const player = new H5PPlayer(libraryStorage, contentStorage, config);
    const ajax = new H5PAjaxEndpoint(editor);

    this.instancias = { editor, player, ajax };
    this.logger.log(`H5P server montado (data: ${this.dataDir}).`);
    return this.instancias;
  }

  /**
   * Guarda (crea o actualiza) el contenido H5P que produjo el editor del web y lo
   * enlaza a la lección como `lxp.contenidos` tipo `h5p`. Devuelve el `contentId`.
   */
  async guardarContenido(d: {
    contentId?: string;
    library: string;
    params?: unknown;
    metadata?: unknown;
    usuario: IUser;
    leccionId?: string;
    titulo?: string;
    orden?: number;
  }): Promise<{ contentId: string; registrado: boolean }> {
    const { editor } = this.motor();
    const contentId = await editor.saveOrUpdateContent(
      // H5P tipa `contentId` como string, pero acepta `undefined` para crear nuevo.
      (d.contentId ?? undefined) as unknown as string,
      d.params as ContentParameters,
      d.metadata as IContentMetadata,
      d.library,
      d.usuario,
    );

    let registrado = false;
    if (d.leccionId) {
      await registrarContenidoH5p(this.db.sql, {
        contentId,
        leccionId: d.leccionId,
        titulo: d.titulo?.trim() || (d.metadata as { title?: string })?.title || 'Contenido H5P',
        orden: d.orden,
      });
      registrado = true;
    }
    this.logger.log(`H5P guardado: contentId ${contentId} (registrado en lección: ${registrado}).`);
    return { contentId, registrado };
  }

  /**
   * Sube un PAQUETE .h5p a la Biblioteca de Contenido (§5C): instala las librerías que
   * trae el paquete y guarda su contenido, devolviendo el `contentId` (sin enlazar a
   * lección — el web crea el lxp.recursos). Es DOMINIO (H5P server), no proxy de CRUD (§2).
   */
  async subirPaquete(d: {
    archivo: Buffer;
    usuario: IUser;
    titulo?: string;
  }): Promise<{ contentId: string; titulo: string }> {
    const { editor } = this.motor();
    const { metadata, parameters } = await editor.uploadPackage(d.archivo, d.usuario);
    const meta = metadata as IContentMetadata;
    const dep = (meta.preloadedDependencies ?? []).find((x) => x.machineName === meta.mainLibrary);
    if (!dep) {
      throw new BadRequestException('El paquete .h5p no declara su librería principal.');
    }
    const ubername = `${dep.machineName} ${dep.majorVersion}.${dep.minorVersion}`;
    const contentId = await editor.saveOrUpdateContent(
      undefined as unknown as string,
      parameters as ContentParameters,
      meta,
      ubername,
      d.usuario,
    );
    const titulo = d.titulo?.trim() || meta.title || 'Contenido H5P';
    this.logger.log(`H5P .h5p subido a Biblioteca: contentId ${contentId} ("${titulo}").`);
    return { contentId, titulo };
  }

  /** Modelo del editor (para crear/editar). `contentId` vacío = contenido nuevo. */
  paraEditar(contentId: string | undefined, usuario: IUser): Promise<unknown> {
    const { editor } = this.motor();
    return editor.render(contentId ?? (undefined as unknown as string), this.idioma, usuario);
  }

  /** Modelo del player (para reproducir el contenido en el campus). */
  reproducir(contentId: string, usuario: IUser): Promise<unknown> {
    const { player } = this.motor();
    return player.render(contentId, usuario, this.idioma);
  }

  /** AJAX GET del editor (content-type-cache, libraries…). */
  ajaxGet(
    action: string,
    q: {
      machineName?: string;
      majorVersion?: string;
      minorVersion?: string;
      language?: string;
    },
    usuario: IUser,
  ): Promise<unknown> {
    const { ajax } = this.motor();
    return ajax.getAjax(
      action,
      q.machineName,
      q.majorVersion,
      q.minorVersion,
      q.language ?? this.idioma,
      usuario,
    );
  }

  /** AJAX POST del editor (libraries, translations, filter, get-content…). */
  ajaxPost(
    action: string,
    body: unknown,
    usuario: IUser,
    archivo?: { data?: Buffer; mimetype: string; name: string; size: number },
  ): Promise<unknown> {
    const { ajax } = this.motor();
    return ajax.postAjax(
      action,
      body as never,
      this.idioma,
      usuario,
      archivo,
    );
  }

  /** Sirve un archivo de una librería instalada (JS/CSS/assets del content type). */
  archivoLibreria(ubername: string, filename: string): Promise<unknown> {
    const { ajax } = this.motor();
    return ajax.getLibraryFile(ubername, filename);
  }

  /** Sirve un archivo del contenido (imágenes/media subidos al contenido). */
  archivoContenido(contentId: string, filename: string, usuario: IUser): Promise<unknown> {
    const { ajax } = this.motor();
    return ajax.getContentFile(contentId, filename, usuario);
  }
}
