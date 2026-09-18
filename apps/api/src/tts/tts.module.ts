import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';
import { TtsConfigService } from './config/tts-config.service';
import { TtsProveedorFactory } from './proveedores/tts-proveedor.factory';
import { MockTtsProvider } from './proveedores/mock.proveedor';
import { OpenAiTtsProvider } from './proveedores/openai.proveedor';

/**
 * Módulo de TTS (course builder). `DbService` y `ColasProducer` son globales; aquí
 * se proveen el servicio, la config, el factory y los adaptadores intercambiables.
 * Exporta `TtsService` para que Eco pueda orquestar la narración (§7A).
 */
@Module({
  controllers: [TtsController],
  providers: [
    TtsService,
    TtsConfigService,
    TtsProveedorFactory,
    MockTtsProvider,
    OpenAiTtsProvider,
    StorageService,
  ],
  exports: [TtsService],
})
export class TtsModule {}
