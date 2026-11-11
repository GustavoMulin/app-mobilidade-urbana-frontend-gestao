<template>
  <q-card flat bordered class="bloco-motorista">
    <q-item class="q-pa-md">
      <q-item-section avatar>
        <q-avatar v-if="motorista.user?.foto_thumbnail" size="48px">
          <img :src="motorista.user.foto" />
        </q-avatar>
        <q-avatar v-else size="48px" color="primary" text-color="white">
          {{ motorista.nome?.charAt(0) }}
        </q-avatar>
      </q-item-section>

      <q-item-section>
        <q-item-label class="text-subtitle1 text-bold">
          {{ motorista.nome }}
          <q-badge v-if="temNovo" color="primary" class="q-ml-sm" label="Novo" />
        </q-item-label>
        <q-item-label caption>CPF: {{ motorista.cpf }}</q-item-label>
        <q-item-label caption>
          <q-badge
            :color="corDoStatus(status)"
            :label="`${motorista.documentos.length} ${
              motorista.documentos.length === 1 ? 'documento' : 'documentos'
            } · ${rotuloDoStatus(status).toLowerCase()}`"
          />
          <span
            v-if="status === 'em_analise' && motorista.pendente_desde"
            class="q-ml-sm"
            :class="atrasado(motorista.pendente_desde) ? 'text-negative text-bold' : ''"
          >
            <q-icon name="schedule" size="14px" /> aguardando
            {{ tempoDecorrido(motorista.pendente_desde).replace('há ', '') }}
          </span>
        </q-item-label>
      </q-item-section>

      <q-item-section side>
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            icon="folder_open"
            label="Cadastro completo"
            @click="$emit('conferir', motorista)"
          />
          <q-btn
            v-if="podeAnalisar && status === 'em_analise' && aprovaveis.length > 1"
            unelevated
            dense
            no-caps
            color="positive"
            icon="done_all"
            class="q-px-sm"
            :label="`Aprovar ${aprovaveis.length}`"
            :loading="ocupado"
            :disable="ocupado"
            @click="$emit('aprovar-todos', motorista, aprovaveis)"
          >
            <q-tooltip>Aprova os documentos que não precisam de conferência de dados</q-tooltip>
          </q-btn>
        </div>
      </q-item-section>
    </q-item>

    <q-separator />

    <q-list separator>
      <q-item v-for="documento in motorista.documentos" :key="documento.id" class="q-py-sm">
        <q-item-section avatar>
          <q-avatar rounded color="grey-2" text-color="grey-8" size="44px">
            <q-icon :name="ICONES_DOCUMENTO[documento.tipo_documento] || 'attach_file'" />
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-bold">
            {{ documento.titulo }}
            <q-badge
              v-if="novosIds.has(documento.id)"
              color="primary"
              class="q-ml-sm"
              label="Novo"
            />
          </q-item-label>
          <q-item-label caption>
            <span v-if="documento.veiculo?.placa">
              {{ documento.veiculo.placa }}
              {{ [documento.veiculo.marca, documento.veiculo.modelo].filter(Boolean).join(' ') }} ·
            </span>
            <span v-else-if="documento.solicitacao_veiculo">Novo veículo enviado pelo app · </span>
            <span v-if="documento.verso?.url">frente e verso · </span>
            enviado {{ tempoDecorrido(documento.enviado_em) }}
          </q-item-label>
          <q-item-label v-if="precisaConferencia(documento) && status === 'em_analise'" caption>
            <q-icon name="info" size="14px" color="warning" />
            Requer conferência dos dados no cadastro
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="row items-center no-wrap q-gutter-xs">
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="visibility"
              label="Ver"
              @click="$emit('visualizar', motorista, documento)"
            />
            <template v-if="podeAnalisar">
              <q-btn
                v-if="status !== 'reprovado'"
                flat
                dense
                round
                color="negative"
                icon="close"
                :aria-label="`Reprovar ${documento.titulo}`"
                :disable="ocupado"
                @click="$emit('reprovar', motorista, documento)"
              >
                <q-tooltip>Reprovar</q-tooltip>
              </q-btn>
              <q-btn
                v-if="status !== 'aprovado' && !precisaConferencia(documento)"
                flat
                dense
                round
                color="positive"
                icon="done"
                :aria-label="`Aprovar ${documento.titulo}`"
                :loading="ocupado"
                :disable="ocupado"
                @click="$emit('aprovar', motorista, documento)"
              >
                <q-tooltip>Aprovar</q-tooltip>
              </q-btn>
            </template>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  ICONES_DOCUMENTO,
  atrasado,
  corDoStatus,
  precisaConferencia,
  rotuloDoStatus,
  tempoDecorrido,
} from 'src/utils/documentosFila'

const props = defineProps({
  motorista: { type: Object, required: true },
  status: { type: String, default: 'em_analise' },
  podeAnalisar: Boolean,
  ocupado: Boolean,
  novosIds: { type: Object, default: () => new Set() },
})

defineEmits(['visualizar', 'aprovar', 'reprovar', 'conferir', 'aprovar-todos'])

const temNovo = computed(() =>
  props.motorista.documentos.some((documento) => props.novosIds.has(documento.id)),
)

const aprovaveis = computed(() =>
  props.motorista.documentos.filter((documento) => !precisaConferencia(documento)),
)
</script>
