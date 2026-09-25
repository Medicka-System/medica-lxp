import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EcoConfigService } from './config/eco-config.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { EvaluacionPipeline } from './pipeline/evaluacion.pipeline';
import { EcoTelemetriaService } from './costo/eco-telemetria.service';
import { CorreccionesService } from './correcciones/correcciones.service';
import { EcoChatService } from './eco-chat/eco-chat.service';
import { MockProvider } from './proveedores/mock.proveedor';
import { AnthropicProvider } from './proveedores/anthropic.proveedor';
import { ProveedorFactory } from './proveedores/proveedor.factory';
import { SimuladorController } from './simuladores/simulador.controller';
import { SimuladorService } from './simuladores/simulador.service';
import { TtsModule } from '../tts/tts.module';
import { XapiModule } from '../xapi/xapi.module';

/**
 * Eco — asistente de IA transversal (§4 `src/ai` · §7A). Todo el engine
 * CONFIGURABLE (nada hardcodeado) y MODELO-AGNÓSTICO:
 *   · config editable en BD (`EcoConfigService` ← `lxp.eco_config`)
 *   · adaptadores de LLM intercambiables (`ProveedorFactory`: mock/anthropic)
 *   · pipeline tools-first (`EvaluacionPipeline`) + RAG (`EmbeddingsService`)
 *   · cierre humano (`CorreccionesService`) — Eco propone, el docente decide.
 *   · simuladores IA (`SimuladorService` · Sprint 7) — reusan el pipeline para
 *     entrenar al alumno contra la verdad del caso; NO reconstruyen Eco.
 * Usa DbModule y ColasModule (globales); importa XapiModule para emitir eventos de
 * práctica. No reimplementa dominio de otros módulos.
 */
@Module({
  imports: [TtsModule, XapiModule],
  controllers: [AiController, SimuladorController],
  providers: [
    AiService,
    EcoConfigService,
    EmbeddingsService,
    EvaluacionPipeline,
    EcoTelemetriaService,
    CorreccionesService,
    EcoChatService,
    MockProvider,
    AnthropicProvider,
    ProveedorFactory,
    SimuladorService,
  ],
  exports: [AiService, EcoConfigService],
})
export class AiModule {}
