<template>
  <q-page class="q-pa-md">
    <CriarMidia @updated="aoCriar" v-model="dialog.cadastrar" />
    <CidadesMidia v-model="dialog.cidades" :banner="bannerDasCidades" @updated="request" />
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

            <q-td key="cidades">
              <span v-if="!props.row.cidades?.length" class="text-grey-6">Nenhuma</span>
              <template v-else>
                <q-chip
                  v-for="cidade in props.row.cidades.slice(0, 2)"
                  :key="cidade.id"
                  dense
                  size="sm"
                >
                  {{ cidade.nome }}/{{ cidade.uf }}
                </q-chip>
                <q-chip v-if="props.row.cidades.length > 2" dense size="sm" outline>
                  +{{ props.row.cidades.length - 2 }}
                </q-chip>
              </template>
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
                @click="abrirCidades(props.row)"
                dense
                flat
                icon="location_city"
                aria-label="Escolher as cidades do anúncio"
              >
                <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                  cidades
                </q-tooltip>
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
import CidadesMidia from 'src/components/midia/CidadesMidia.vue'

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
  cidades: false,
  visualizar: false,
})

const registroVisualizado = ref(null)
const bannerDasCidades = ref(null)

const abrirCidades = (banner) => {
  bannerDasCidades.value = banner
  dialog.cidades = true
}

// o anúncio nasce sem cidade: logo depois de criar, abre a escolha das cidades
const aoCriar = async (criado) => {
  await request()
  if (criado) abrirCidades(criado)
}

const pagination = ref({
  page: 1,
  rowsPerPage: 5,
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'titulo', label: 'Título', field: 'titulo', align: 'left' },
  { name: 'cidades', label: 'Cidades', field: (row) => row.cidades?.length, align: 'left' },
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
