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
        </q-item-section>

        <q-item-section side>
          <div class="row items-center justify-end no-wrap">
            <q-btn
              v-if="documento.url"
              :disable="ocupado"
              :loading="baixando === documento.id"
              aria-label="Baixar documento"
              icon="download"
              dense
              flat
              round
              @click="!documento.verso?.url && $emit('baixar', documento, 'frente')"
            >
              <q-tooltip>Baixar documento</q-tooltip>
              <q-menu v-if="documento.verso?.url">
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="$emit('baixar', documento, 'frente')">
                    <q-item-section>Baixar frente</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="$emit('baixar', documento, 'verso')">
                    <q-item-section>Baixar verso</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-btn
              :disable="ocupado"
              color="black"
              flat
              round
              dense
              aria-label="Expandir documento"
              @click="$emit('expandir', motorista, documento)"
            >
              <q-icon :name="ICONE_EXPANDIR" class="cursor-pointer" />
              <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                Expandir documento
              </q-tooltip>
            </q-btn>
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
  rotuloDoStatus,
  tempoDecorrido,
} from 'src/utils/documentosFila'

const props = defineProps({
  motorista: { type: Object, required: true },
  status: { type: String, default: 'em_analise' },
  ocupado: Boolean,
  baixando: { type: Number, default: null },
  novosIds: { type: Object, default: () => new Set() },
})

defineEmits(['baixar', 'expandir', 'conferir'])

// mesmo ícone de expandir do diálogo de documentos do motorista
const ICONE_EXPANDIR = 'M14 4h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6z'

const temNovo = computed(() =>
  props.motorista.documentos.some((documento) => props.novosIds.has(documento.id)),
)
</script>
