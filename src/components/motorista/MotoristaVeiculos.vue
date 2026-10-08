<template>
  <section>
    <AdicionarVeiculo
      :usuario="usuario"
      @onRequest="onRequest()"
      v-model="dialog"
      @hide="reabrirPrincipal($event)"
    />
    <q-dialog v-model="model" @before-show="beforeShow" @before-hide="onBeforeHide">
      <q-card style="width: 600px; max-width: 95vw">
        <q-toolbar>
          <!-- <q-avatar rounded size="md" icon="directions_car" color="primary" text-color="white" /> -->
          <q-toolbar-title>
            Veículos do motorista
            <!-- <span> Veículos do motorista </span> -->
          </q-toolbar-title>

          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>

        <q-separator />
        <CardPerfilUsuario class="q-mt-sm" :usuario="usuario" />

        <q-card-section
          v-if="loading && !data.length"
          class="column items-center justify-center q-py-xl text-primary"
          role="status"
          aria-live="polite"
        >
          <q-spinner size="40px" />
          <span class="q-mt-md">Carregando veículos…</span>
        </q-card-section>
        <q-card-section v-else-if="erroCarregamento" class="text-center q-py-lg">
          <div class="text-negative" role="alert">Não foi possível carregar os veículos.</div>
          <q-btn
            class="q-mt-md"
            flat
            color="primary"
            label="Tentar novamente"
            @click="onRequest()"
          />
        </q-card-section>
        <q-card-section v-else-if="!data.length" class="text-center q-py-lg">
          <div class="text-grey-7">Nenhum veículo encontrado.</div>
          <q-card-actions class="q-mt-md" align="center">
            <q-btn color="primary" @click="abrirAdicionarVeiculo()" flat>ADICIONAR VEÍCULO</q-btn>
          </q-card-actions>
        </q-card-section>

        <q-card-section v-else>
          <div class="q-pa-xs">
            <q-table
              :rows="data"
              :columns="columns"
              row-key="id"
              :pagination="pagination"
              :loading="loading"
              @request="onRequest"
            >
              <template #top>
                <q-space />
                <q-input
                  class="full-width"
                  filled
                  dense
                  debounce="300"
                  v-model="search"
                  placeholder="Pesquisar"
                  @keyup.enter="onRequest()"
                >
                  <template #before>
                    <q-btn
                      icon="add_box"
                      label="ADICIONAR VEÍCULO"
                      color="primary"
                      @click="abrirAdicionarVeiculo()"
                    />
                  </template>

                  <template v-if="search" #append>
                    <q-icon name="close" class="cursor-pointer" @click="clearSearch" />
                  </template>
                </q-input>
              </template>

              <template #body="props">
                <q-tr :props="props">
                  <q-td key="id">{{ props.row.id }}</q-td>

                  <q-td key="veiculo">
                    <q-item>
                      <q-item-section top avatar>
                        <q-avatar rounded color="primary" text-color="white" icon="directions_car">
                        </q-avatar>
                        <q-badge class="q-mt-sm" :label="props.row.veiculo.marca" color="grey-7" />
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="text-bold">
                          {{ props.row.veiculo.modelo }}</q-item-label
                        >
                        <q-item-label class="estilo-coluna">
                          {{ props.row.veiculo.renavam }}
                          <div>PLACA: {{ props.row.veiculo.placa }}</div>
                          <div>COR: {{ props.row.veiculo.cor }}</div>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-td>

                  <q-td key="status">
                    <q-badge :color="badgeColor(props.row.veiculo.status)">
                      {{ formatarStatus(props.row.veiculo.status) }}
                    </q-badge>
                  </q-td>

                  <q-td key="acoes" align="center">
                    <q-btn dense flat icon="visibility">
                      <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                        visualizar
                      </q-tooltip>
                      <template v-slot:loading>
                        <q-spinner-hourglass />
                      </template>
                    </q-btn>
                    <q-btn dense flat icon="delete">
                      <template v-slot:loading>
                        <q-spinner-hourglass />
                      </template>
                    </q-btn>
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import AdicionarVeiculo from 'src/components/motorista/AdicionarVeiculo.vue'
import CardPerfilUsuario from 'src/components/usuarios/CardPerfilUsuario.vue'

// import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { formatarStatus } from 'src/utils/status'

// PROPS
const props = defineProps({
  modelValue: Boolean,
  usuario: [Object],
})

// EMITS
const emit = defineEmits(['update:modelValue'])

// const $q = useQuasar()

// MODEL
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// STATE
const loading = ref(false)
const erroCarregamento = ref(false)
let requestVersion = 0
const search = ref('')
const dialog = ref(false)
const data = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
})

const columns = [
  {
    name: 'id',
    required: true,
    label: '',
    align: 'left',
    field: (row) => row.name,
    format: (val) => `${val}`,
  },
  {
    name: 'veiculo',
    required: true,
    label: 'Documentos',
    align: 'left',
    field: (row) => row.name,
    format: (val) => `${val}`,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'left',
  },
  {
    name: 'acoes',
    label: 'Ações',
    align: 'center',
  },
]

// LIFECYCLE
function beforeShow() {
  data.value = []
  request()
}

function onBeforeHide() {
  requestVersion++
  loading.value = false
  erroCarregamento.value = false
  data.value = []
}

function reabrirPrincipal(valor) {
  console.log(valor, 'passou em reabrirPrincipal')
  if (!valor) {
    model.value = true
  }
}

function abrirAdicionarVeiculo() {
  console.log('abrirAdicionarVeiculo')
  model.value = false
  dialog.value = true
}

const badgeColor = (status) => {
  if (status === 'em_analise') return 'orange'
  if (status === 'aprovado') return 'green'
  if (status === 'reprovado') return 'red'
  if (status === 'ativo') return 'green'
  if (status === 'inativo') return 'orange'
  if (status === 'pendente') return 'warning'
  if (status === 'bloqueado') return 'red'
}

const onRequest = async (props) => {
  await request(props)
}

function clearSearch() {
  search.value = ''
  pagination.value.page = 1
  request()
}

const request = async (payload) => {
  if (!props?.usuario?.id) return
  const version = ++requestVersion
  loading.value = true
  erroCarregamento.value = false
  const { page, rowsPerPage } = payload?.pagination || pagination.value
  try {
    const response = await api.get(`/motorista-veiculos/${props.usuario?.id}`, {
      params: {
        search: search.value || '',
        page: page,
        rowsPerPage: rowsPerPage,
      },
      timeout: 15000,
    })

    if (version !== requestVersion) return
    data.value = response.data.data

    const paginate = response.data
    pagination.value.rowsNumber = paginate.total
    pagination.value.page = paginate.current_page
    pagination.value.rowsPerPage = paginate.per_page === paginate.total ? 0 : paginate.per_page
  } catch (error) {
    if (version === requestVersion) {
      erroCarregamento.value = true
      console.error(error)
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
</script>
<style scoped>
.estilo-coluna {
  max-width: 200px;
  white-space: normal;
  margin-top: 4px;
}
</style>
