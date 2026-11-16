<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-table
        :rows="visiveis"
        :columns="colunas"
        row-key="id"
        :loading="carregando"
        v-model:pagination="paginacao"
        :rows-per-page-options="[20, 50, 100]"
        no-data-label="Nenhuma cidade encontrada."
      >
        <template #top>
          <div class="row q-col-gutter-sm full-width items-center">
            <div class="col-12 col-md-auto">
              <q-btn
                color="primary"
                icon="add_location_alt"
                label="Nova cidade"
                @click="abrirFormulario()"
              />
            </div>
            <div class="col-12 col-sm-3 col-md-2">
              <q-select v-model="uf" :options="UFS" label="UF" dense filled clearable />
            </div>
            <div class="col">
              <q-input
                v-model="busca"
                dense
                filled
                clearable
                debounce="200"
                placeholder="Buscar pelo nome ou pelo código IBGE"
              >
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </div>
          </div>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              dense
              flat
              round
              icon="edit"
              aria-label="Editar cidade"
              @click="abrirFormulario(props.row)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              dense
              flat
              round
              icon="delete"
              color="negative"
              aria-label="Excluir cidade"
              @click="excluir(props.row)"
            >
              <q-tooltip>Excluir</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="formulario.aberto" persistent>
      <q-card style="width: 420px; max-width: 90vw">
        <q-form @submit.prevent="salvar">
          <q-card-section class="text-h6">
            {{ formulario.id ? 'Editar cidade' : 'Nova cidade' }}
          </q-card-section>

          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.nome"
              label="Nome *"
              filled
              autofocus
              :error="!!erros.nome"
              :error-message="erros.nome"
            />
            <q-select
              v-model="formulario.uf"
              :options="UFS"
              label="UF *"
              filled
              :error="!!erros.uf"
              :error-message="erros.uf"
            />
            <q-input
              v-model="formulario.ibge"
              label="Código IBGE *"
              mask="#######"
              hint="7 dígitos, como 1100205 (Porto Velho)"
              filled
              :error="!!erros.ibge"
              :error-message="erros.ibge"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" :disable="salvando" v-close-popup />
            <q-btn type="submit" color="primary" label="Salvar" :loading="salvando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { semAcento } from 'src/utils/texto'

// as mesmas siglas que o backend aceita (Cidade::UFS)
const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

const colunas = [
  { name: 'nome', label: 'Cidade', field: 'nome', align: 'left', sortable: true },
  { name: 'uf', label: 'UF', field: 'uf', align: 'left', sortable: true },
  { name: 'ibge', label: 'Código IBGE', field: 'ibge', align: 'left' },
  { name: 'banners', label: 'Banners', field: 'banners_count', align: 'center' },
  { name: 'acoes', label: 'Ações', field: 'id', align: 'center' },
]

const $q = useQuasar()
const cidades = ref([])
const carregando = ref(false)
const busca = ref('')
const uf = ref(null)
const paginacao = ref({ page: 1, rowsPerPage: 20 })
const salvando = ref(false)
const erros = ref({})
const formulario = reactive({ aberto: false, id: null, nome: '', uf: null, ibge: '' })

// são todos os municípios do IBGE: a busca e o filtro rodam aqui, sem ir ao servidor
const visiveis = computed(() => {
  const termo = semAcento(busca.value)
  return cidades.value.filter(
    (cidade) =>
      (!uf.value || cidade.uf === uf.value) &&
      (!termo || semAcento(cidade.nome).includes(termo) || String(cidade.ibge).includes(termo)),
  )
})

watch([busca, uf], () => {
  paginacao.value.page = 1
})

async function carregar() {
  carregando.value = true
  try {
    const { data } = await api.get('/cidades')
    cidades.value = data
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Não foi possível carregar as cidades.',
    })
  } finally {
    carregando.value = false
  }
}

function abrirFormulario(cidade = null) {
  Object.assign(formulario, {
    aberto: true,
    id: cidade?.id ?? null,
    nome: cidade?.nome ?? '',
    uf: cidade?.uf ?? uf.value,
    ibge: cidade ? String(cidade.ibge) : '',
  })
  erros.value = {}
}

async function salvar() {
  if (salvando.value) return
  salvando.value = true
  erros.value = {}
  const dados = { nome: formulario.nome, uf: formulario.uf, ibge: formulario.ibge }
  try {
    const { data } = formulario.id
      ? await api.put(`/cidades/${formulario.id}`, dados)
      : await api.post('/cidades', dados)
    $q.notify({ type: 'positive', message: data.message })
    formulario.aberto = false
    await carregar()
  } catch (err) {
    const porCampo = err.response?.data?.errors
    if (porCampo) {
      erros.value = Object.fromEntries(
        Object.entries(porCampo).map(([campo, mensagens]) => [campo, mensagens[0]]),
      )
    } else {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Não foi possível salvar a cidade.',
      })
    }
  } finally {
    salvando.value = false
  }
}

function excluir(cidade) {
  $q.dialog({
    title: 'Excluir cidade',
    message: `Excluir ${cidade.nome}/${cidade.uf}? Motoristas e corridas dela ficam sem cidade.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const { data } = await api.delete(`/cidades/${cidade.id}`)
      $q.notify({ type: 'positive', message: data.message })
      await carregar()
    } catch (err) {
      // 409: a cidade tem banner ou tarifa própria
      $q.notify({
        type: 'warning',
        message: err.response?.data?.message || 'Não foi possível excluir a cidade.',
      })
    }
  })
}

onMounted(carregar)
</script>
