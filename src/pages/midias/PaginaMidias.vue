<template>
  <q-page class="q-pa-md">
    <CriarMidia @updated="onRequest" v-model="dialog.cadastrar" />
    <VisualizarRegistro v-model="dialog.visualizar" tipo="midia" :registro="registroVisualizado" />
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
        <template #top>
          <q-space />
          <q-input
            class="full-width"
            filled
            dense
            debounce="300"
            v-model="search"
            placeholder="Pesquisar"
            @keyup.enter="request"
          >
            <template #before>
              <q-btn
                icon="image"
                color="primary"
                @click="dialog.cadastrar = true"
                label="CRIAR ANÚNCIO"
                class="q-mr-sm"
              />
              <q-btn-toggle
                class="q-mr-sm"
                @update:model-value="
                  (val) => {
                    dominio = val
                    request()
                  }
                "
                v-model="dominio"
                toggle-color="primary"
                :options="[
                  { label: 'Ativos', value: 'publicidades' },
                  { label: 'Arquivados', value: 'publicidades-arquivados' },
                ]"
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

            <q-td key="titulo">
              {{ props.row.titulo }}
            </q-td>

            <q-td key="cidade">
              {{ props.row.cidade ? `${props.row.cidade.nome}/${props.row.cidade.uf}` : '—' }}
            </q-td>

            <q-td key="imagem">
              <q-item>
                <q-item-section thumbnail>
                  <img :src="props.row.url" />
                </q-item-section>
              </q-item>
            </q-td>

            <q-td key="acoes" align="center">
              <q-btn
                @click="openVisualizar(props.row)"
                dense
                flat
                icon="visibility"
                aria-label="Visualizar registro"
              >
                <template v-slot:loading>
                  <q-spinner-hourglass />
                </template>
              </q-btn>

              <q-btn
                v-if="dominio === 'publicidades'"
                @click="arquivar(props.row)"
                dense
                flat
                icon="delete"
              >
                <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                  arquivar
                </q-tooltip>
              </q-btn>

              <q-btn v-else @click="restaurar(props.row)" dense flat icon="restore_from_trash">
                <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                  restaurar
                </q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>
        </template>

        <!-- GRID -->
        <template #item="props">
          <div class="q-pa-xs col-xs-12 col-sm-6 col-md-3">
            <q-card>
              <q-item clickable @click="openVisualizar(props.row)">
                <q-item-section avatar>
                  <!-- <q-avatar size="70px">
                    <img v-if="props.row.imagem" :src="props.row.imagem" />
                    <span v-else>
                      {{ props.row.titulo?.charAt(0) }}
                    </span>
                  </q-avatar> -->
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ props.row.titulo }}</q-item-label>
                  <q-item-label caption>
                    <!-- {{ props.row.email }} -->
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import VisualizarRegistro from 'src/components/VisualizarRegistro.vue'
// import CardPerfilUsuario from 'src/components/usuarios/CardPerfilUsuario.vue'
import CriarMidia from 'src/components/midia/CriarMidia.vue'

const $q = useQuasar()

// STATES
const data = ref([])
const dominio = ref('publicidades')
const loading = ref(false)
const search = ref('')
const grid = ref(false)

const dialog = reactive({
  editar: false,
  cadastrar: false,
  visualizar: false,
})

const registroVisualizado = ref(null)

const pagination = ref({
  page: 1,
  rowsPerPage: 5,
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'titulo', label: 'Título', field: 'titulo', align: 'left' },
  { name: 'cidade', label: 'Cidade', field: (row) => row.cidade?.nome, align: 'left' },
  { name: 'imagem', label: 'Banner', field: 'path', align: 'left' },
  { name: 'acoes', label: 'Ações', align: 'center' },
]

const clearSearch = () => {
  search.value = ''
  pagination.value.page = 1
  request()
}

const openVisualizar = (registro) => {
  registroVisualizado.value = registro
  dialog.visualizar = true
}

// o banner sai do app e vai para Arquivados (dá para restaurar)
const arquivar = (banner) => {
  $q.dialog({
    title: 'Arquivar',
    message: `Arquivar o anúncio "${banner.titulo}"? Ele deixa de aparecer no app.`,
    cancel: true,
    persistent: true,
  }).onOk(() => acaoNoBanner(() => api.delete(`publicidades/${banner.id}`)))
}

const restaurar = (banner) => acaoNoBanner(() => api.post(`publicidades/${banner.id}/restaurar`))

async function acaoNoBanner(chamada) {
  try {
    const { data: resposta } = await chamada()
    $q.notify({ type: 'positive', message: resposta.message })
    await request()
  } catch (err) {
    $q.notify({
      type: 'warning',
      message: err.response?.data?.message || 'Erro na operação',
    })
  }
}

const request = async (props) => {
  loading.value = true
  const { page, rowsPerPage } = props?.pagination ?? pagination.value
  try {
    const response = await api.get(`${dominio.value}`, {
      params: {
        page: page,
        // 0 = "todos" na tabela; o backend devolve até 50 por página
        per_page: rowsPerPage || 50,
      },
    })

    data.value = response.data.data
    const paginate = response.data
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
  await request(props)
}

// LIFECYCLE
onMounted(() => {
  request()
})
</script>

<style scoped>
.estilo-coluna {
  max-width: 200px;
  white-space: normal;
  margin-top: 4px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
