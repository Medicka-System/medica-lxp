import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EcoConfigService } from './config/eco-config.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { EvaluacionPipeline } from './pipeline/evaluacion.pipeline';
import { CorreccionesService } from './correcciones/correcciones.service';
import { MockProvider } from './proveedores/mock.proveedor';
import { AnthropicProvider } from './proveedores/anthropic.proveedor';
import { ProveedorFactory } from './proveedores/proveedor.factory';
import { TtsModule } from '../tts/tts.module';

/**
 * Eco — asistente de IA transversal (§4 `src/ai` · §7A). Todo el engine
 * CONFIGURABLE (nada hardcodeado) y MODELO-AGNÓSTICO:
 *   · config editable en BD (`EcoConfigService` ← `lxp.eco_config`)
 *   · adaptadores de LLM intercambiables (`ProveedorFactory`: mock/anthropic)
 *   · pipeline tools-first (`EvaluacionPipeline`) + RAG (`EmbeddingsService`)
 *   · cierre humano (`CorreccionesService`) — Eco propone, el docente decide.
 * Usa DbModule y ColasModule (globales). No reimplementa dominio de otros módulos.
 */
@Module({
  imports: [TtsModule],
  controllers: [AiController],
  providers: [
    AiService,
    EcoConfigService,
    EmbeddingsService,
    EvaluacionPipeline,
    CorreccionesService,
    MockProvider,
    AnthropicProvider,
    ProveedorFactory,
  ],
  exports: [AiService, EcoConfigService],
})
export class AiModule {}
