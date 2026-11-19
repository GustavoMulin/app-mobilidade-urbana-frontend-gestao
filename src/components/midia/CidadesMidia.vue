<template>
  <q-dialog v-model="model" :persistent="salvando" @before-show="abrir">
    <q-card style="width: 600px; max-width: 90vw">
      <q-toolbar>
        <q-toolbar-title>
          <span class="text-weight-bold">Cidades do anúncio</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" :disable="salvando" v-close-popup />
      </q-toolbar>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">{{ banner?.titulo }}</div>
        <div class="text-grey-7 q-mb-md">
          O app mostra o anúncio só para quem está em uma destas cidades. Sem nenhuma cidade, ele
          não aparece em lugar algum.
        </div>

        <q-select
          v-model="selecionadas"
          :options="cidadesFiltradas"
          label="Cidades"
          outlined
          dense
          multiple
          use-chips
          use-input
          emit-value
          map-options
          input-debounce="0"
          :loading="carregando"
          :disable="salvando"
          @filter="filtrar"
        />
        <div class="text-caption text-grey-7 q-mt-xs">
          {{ selecionadas.length }}
          {{ selecionadas.length === 1 ? 'cidade' : 'cidades' }} selecionada{{
            selecionadas.length === 1 ? '' : 's'
          }}
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancelar" :disable="salvando" v-close-popup />
        <q-btn
          color="primary"
          no-caps
          label="Salvar"
          :loading="salvando"
          :disable="carregando"
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { semAcento } from 'src/utils/texto'

const props = defineProps({
  modelValue: Boolean,
  banner: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const $q = useQuasar()

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const cidades = ref([])
// são todos os municípios do IBGE: a lista só mostra os que combinam com o que foi digitado
const cidadesFiltradas = ref([])
const selecionadas = ref([])
const carregando = ref(false)
const salvando = ref(false)

function filtrar(busca, update) {
  const termo = semAcento(busca)
  update(() => {
    cidadesFiltradas.value = termo
      ? cidades.value.filter((cidade) => semAcento(cidade.label).includes(termo))
      : cidades.value
  })
}

async function abrir() {
  selecionadas.value = (props.banner?.cidades ?? []).map((cidade) => cidade.id)
  if (cidades.value.length) return

  carregando.value = true
  try {
    const { data } = await api.get('/cidades')
    cidades.value = data.map((cidade) => ({
      label: `${cidade.nome}/${cidade.uf}`,
      value: cidade.id,
    }))
    cidadesFiltradas.value = cidades.value
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Não foi possível carregar as cidades.',
    })
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  if (salvando.value || !props.banner) return

  salvando.value = true
  try {
    const { data } = await api.put(`/publicidades/${props.banner.id}/cidades`, {
      cidade_ids: selecionadas.value,
    })
    $q.notify({ type: 'positive', message: data.message })
    emit('updated')
    model.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Não foi possível salvar as cidades.',
    })
  } finally {
    salvando.value = false
  }
}
</script>
