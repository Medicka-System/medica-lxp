/**
 * Declaración mínima de `dcmjs` (no publica tipos · §3). Solo lo que usa la
 * anonimización binaria (`anonimizacion-binaria.ts`): leer un P10, naturalizar,
 * denaturalizar y reescribir. Deliberadamente laxa (dcmjs es JS dinámico); el
 * contrato fuerte lo pone nuestro módulo, no la librería.
 */
declare module 'dcmjs' {
  export interface DicomDictLeido {
    dict: Record<string, unknown>;
    meta: Record<string, unknown>;
  }

  export class DicomDict {
    constructor(meta: Record<string, unknown>);
    meta: Record<string, unknown>;
    dict: Record<string, unknown>;
    write(): ArrayBuffer;
    upsertTag(tag: string, vr: string, values: unknown): void;
  }

  export const data: {
    DicomMessage: {
      readFile(buffer: ArrayBuffer, options?: { ignoreErrors?: boolean }): DicomDictLeido;
    };
    DicomMetaDictionary: {
      naturalizeDataset(dict: Record<string, unknown>): Record<string, unknown>;
      denaturalizeDataset(dataset: Record<string, unknown>): Record<string, unknown>;
      uid(): string;
    };
    DicomDict: typeof DicomDict;
  };

  const dcmjs: { data: typeof data };
  export default dcmjs;
}
