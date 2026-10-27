<template>
  <q-dialog v-model="aberto" :persistent="salvando" @before-show="preparar">
    <q-card class="formulario-modelo">
      <q-toolbar>
        <q-avatar rounded icon="directions_car" color="primary" text-color="white" />
        <q-toolbar-title class="text-weight-bold">{{ titulo }}</q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Fechar formulário do modelo"
          :disable="salvando"
          v-close-popup
        />
      </q-toolbar>
      <q-separator />

      <q-form @submit="salvar">
        <q-card-section class="q-gutter-md">
          <q-banner v-if="erroGeral" class="bg-red-1 text-negative" rounded role="alert">
            {{ erroGeral }}
          </q-banner>

          <q-btn-toggle
            v-model="formulario.tipo"
            spread
            no-caps
            toggle-color="primary"
            :options="[
              { label: 'Carro', value: 'carro', icon: 'directions_car' },
              { label: 'Moto', value: 'moto', icon: 'two_wheeler' },
            ]"
            :disable="salvando"
          />

          <q-select
            v-model="formulario.marca_id"
            dense
            outlined
            use-input
            input-debounce="0"
            emit-value
            map-options
            option-value="id"
            option-label="nome"
            label="Marca *"
            :options="opcoesMarca"
            :loading="carregandoMarcas"
            :disable="salvando"
            :rules="[(val) => !!val || 'Escolha a marca']"
            :error="!!erros.marca_id"
            :error-message="erros.marca_id"
            @filter="filtrarMarcas"
          >
            <template #no-option>
              <q-item
                ><q-item-section class="text-grey"
                  >Nenhuma marca encontrada.</q-item-section
                ></q-item
              >
            </template>
          </q-select>

          <q-input
            v-model="formulario.modelo"
            dense
            outlined
            label="Modelo *"
            maxlength="120"
            :disable="salvando"
            :rules="[(val) => !!val?.trim() || 'Informe o modelo']"
            :error="!!erros.modelo"
            :error-message="erros.modelo"
          />

          <div class="text-caption text-grey-7">
            Ano mínimo do veículo em cada serviço. Deixe vazio quando o modelo não atende o serviço.
          </div>

          <q-input
            v-model.number="formulario.ano_minimo_entrega"
            dense
            outlined
            type="number"
            label="Entrega"
            :disable="salvando"
            :error="!!erros.ano_minimo_entrega"
            :error-message="erros.ano_minimo_entrega"
          />
          <q-input
            v-model.number="formulario.ano_minimo_corrida"
            dense
            outlined
            type="number"
            :label="formulario.tipo === 'moto' ? 'Moto (passageiro)' : 'Corrida (passageiro)'"
            :disable="salvando"
            :error="!!erros.ano_minimo_corrida"
            :error-message="erros.ano_minimo_corrida"
          />
          <q-input
            v-model.number="formulario.ano_minimo_eletrico"
            dense
            outlined
            type="number"
            label="Elétrico"
            :disable="salvando || formulario.tipo === 'moto'"
            :hint="formulario.tipo === 'moto' ? 'Moto não tem categoria elétrica.' : undefined"
            :error="!!erros.ano_minimo_eletrico"
            :error-message="erros.ano_minimo_eletrico"
          />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="salvando" v-close-popup />
          <q-btn
            color="primary"
            icon="save"
            type="submit"
            :label="modelo ? 'Salvar alterações' : 'Cadastrar modelo'"
            :loading="salvando"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const props = defineProps({
  modelValue: Boolean,
  // modelo a editar; vazio cadastra um novo
  modelo: { type: Object, default: null },
  // marca já escolhida ao cadastrar a partir de uma marca aberta
  marcaId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()

const aberto = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
const vazio = () => ({
  marca_id: null,
  modelo: '',
  tipo: 'carro',
  ano_minimo_entrega: null,
  ano_minimo_corrida: null,
  ano_minimo_eletrico: null,
})
const formulario = reactive(vazio())
const marcas = ref([])
const opcoesMarca = ref([])
const carregandoMarcas = ref(false)
const salvando = ref(false)
const erros = ref({})
const erroGeral = ref('')
const titulo = computed(() => (props.modelo ? 'Editar modelo' : 'Novo modelo'))

// moto não tem elétrico: limpa o campo ao trocar de tipo
watch(
  () => formulario.tipo,
  (tipo) => {
    if (tipo === 'moto') formulario.ano_minimo_eletrico = null
  },
)

async function preparar() {
  erros.value = {}
  erroGeral.value = ''
  Object.assign(
    formulario,
    vazio(),
    { marca_id: props.marcaId },
    props.modelo ? { ...props.modelo } : {},
  )
  carregandoMarcas.value = true
  try {
    const { data } = await api.get('/marcas-veiculos')
    marcas.value = data.data
  } catch {
    marcas.value = []
    erroGeral.value = 'Não foi possível carregar as marcas.'
  } finally {
    carregandoMarcas.value = false
  }
  opcoesMarca.value = marcas.value
}

function filtrarMarcas(texto, atualizar) {
  const busca = texto.trim().toLowerCase()
  atualizar(() => {
    opcoesMarca.value = busca
      ? marcas.value.filter((marca) => marca.nome.toLowerCase().includes(busca))
      : marcas.value
  })
}

// campo numérico vazio vira null, como a API espera
const ano = (valor) =>
  valor === '' || valor === null || valor === undefined ? null : Number(valor)

async function salvar() {
  salvando.value = true
  erros.value = {}
  erroGeral.value = ''
  const dados = {
    marca_id: formulario.marca_id,
    modelo: formulario.modelo.trim(),
    tipo: formulario.tipo,
    ano_minimo_entrega: ano(formulario.ano_minimo_entrega),
    ano_minimo_corrida: ano(formulario.ano_minimo_corrida),
    ano_minimo_eletrico: formulario.tipo === 'moto' ? null : ano(formulario.ano_minimo_eletrico),
  }
  try {
    const { data } = props.modelo
      ? await api.put(`/modelos-veiculos/${props.modelo.id}`, dados)
      : await api.post('/modelos-veiculos', dados)
    $q.notify({ type: 'positive', message: data.message })
    emit('saved')
    aberto.value = false
  } catch (error) {
    const lista = error.response?.data?.errors || {}
    erros.value = Object.fromEntries(
      Object.entries(lista).map(([campo, mensagens]) => [campo, mensagens[0]]),
    )
    if (!Object.keys(erros.value).length) {
      erroGeral.value = error.response?.data?.message || 'Não foi possível salvar o modelo.'
    }
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.formulario-modelo {
  width: 480px;
  max-width: 95vw;
}
</style>
