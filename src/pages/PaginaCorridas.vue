<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-table
        :rows="data"
        :columns="columns"
        row-key="id"
        :pagination="pagination"
        :grid="grid"
        :loading="loading"
        @request="onRequest"
      >
        <!-- TOPO -->
        <template #top>
          <q-space />

          <q-input
            class="full-width"
            filled
            dense
            debounce="300"
            v-model="search"
            placeholder="Pesquisar"
            @keyup.enter="buscarDados"
          >
            <template v-if="search" #append>
              <q-icon name="close" class="cursor-pointer" @click="clearSearch" />
            </template>
          </q-input>
        </template>

        <template #body="props">
          <q-tr :props="props">
            <q-td key="id">{{ props.row.id }}</q-td>

            <q-td key="corrida">
              <q-item>
                <q-item-section>
                  <q-item-label>
                    <span class="text-bold">Código:</span>
                    {{ props.row.codigo_corrida }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Motorista:</span>
                    {{ props.row.motorista?.user?.name || 'Ainda sem motorista' }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Passageiro:</span>
                    {{ props.row.passageiro?.user?.name || '—' }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Veículo:</span>
                    {{ props.row.veiculo?.placa || '—' }}
                  </q-item-label>
                  <div>
                    <span class="text-bold">Status:</span>
                    <q-badge class="q-ml-xs" :color="badgeColor(props.row.status_corrida)">
                      {{ rotuloStatus(props.row.status_corrida) }}
                    </q-badge>
                  </div>
                </q-item-section>
              </q-item>
            </q-td>

            <q-td class="coluna-delimitada" :props="props" key="destinos">
              <div v-for="(corrida, index) in props.row.corrida_destinos" :key="index">
                <q-icon
                  :color="corInconeDestino(corrida.tipo)"
                  size="20px"
                  :name="iconesDestino(corrida.tipo)"
                />
                {{ limitarTexto(corrida.endereco, 20) }}
              </div>
            </q-td>

            <q-td :props="props" key="valores">
              <q-item>
                <q-item-section>
                  <q-item-label>
                    <span class="text-bold">Valor bruto:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.valor_bruto) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Tarifa base:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.tarifa_base) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Taxa de espera:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.taxa_espera) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Desconto do passageiro:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.valor_descontos) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Valor pago:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.valor_pago_passageiro) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Taxa da plataforma:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.taxa_plataforma_valor) }}
                  </q-item-label>
                  <q-item-label>
                    <span class="text-bold">Valor do motorista:</span>
                    {{ moedaBrasileira(props.row.corrida_financeiro?.valor_motorista) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'

// STATES
const data = ref([])

const loading = ref(false)
const search = ref('')
const grid = ref(false)

const pagination = ref({
  page: 1,
  rowsPerPage: 5,
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'corrida', label: 'Corrida', align: 'left' },
  { name: 'destinos', label: 'Destinos', align: 'left' },
  { name: 'valores', label: 'Valores', align: 'left' },
]

function moedaBrasileira(value) {
  if (value === null || value === undefined || value === '') return '—'

  let valor = Number(value)

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const badgeColor = (status) => {
  if (status === 'solicitada') return 'orange'
  if (status === 'aceita' || status === 'motorista_chegou') return 'primary'
  if (status === 'em_andamento') return 'secondary'
  if (status === 'finalizada') return 'green'
  if (status === 'cancelada') return 'red'
  return 'grey'
}

const ROTULOS_STATUS = {
  aguardando_pagamento: 'Aguardando pagamento',
  solicitada: 'Procurando motorista',
  aceita: 'Motorista a caminho',
  motorista_chegou: 'Motorista no local',
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const rotuloStatus = (status) => ROTULOS_STATUS[status] || status || '—'

const iconesDestino = (tipo) => {
  if (tipo === 'origem') return 'arrow_circle_up'
  if (tipo === 'parada') return 'stop_circle'
  if (tipo === 'destino') return 'arrow_circle_down'
}

const corInconeDestino = (tipo) => {
  if (tipo === 'origem') return 'green'
  if (tipo === 'destino') return 'red'
}

function limitarTexto(texto, limite) {
  if (!texto) return ''
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto
}

const clearSearch = () => {
  search.value = ''
  pagination.value.page = 1
  buscarDados()
}

const buscarDados = async (props) => {
  loading.value = true
  const { page, rowsPerPage } = props ? props.pagination : pagination
  try {
    const response = await api.get('/corridas', {
      params: {
        search: search.value || '',
        page: page,
        rowsPerPage: rowsPerPage,
      },
    })

    const paginate = response.data

    data.value = response.data.data
    pagination.value.rowsNumber = paginate.total
    pagination.value.page = paginate.current_page
    pagination.value.rowsPerPage = paginate.per_page === paginate.total ? 0 : paginate.per_page
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
const onRequest = async (props) => {
  await buscarDados(props)
}

// LIFECYCLE
onMounted(() => {
  buscarDados()
})
</script>

<style scoped>
.coluna-delimitada {
  max-width: 200px;
  white-space: normal;
  margin-top: 4px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
