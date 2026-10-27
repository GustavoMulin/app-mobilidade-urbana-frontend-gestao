<template>
  <q-page class="q-pa-md">
    <FormularioMarcaVeiculo v-model="marcaAberta" :marca="marcaSelecionada" @saved="recarregar" />
    <FormularioModeloVeiculo
      v-model="modeloAberto"
      :modelo="modeloSelecionado"
      :marca-id="marcaParaNovoModelo"
      @saved="recarregar"
    />
    <JanelaConfirmacao v-model="confirmandoMarca" @confirm="excluirMarca">
      Remover a marca {{ marcaSelecionada?.nome }} e todos os modelos dela?
    </JanelaConfirmacao>
    <JanelaConfirmacao v-model="confirmandoModelo" @confirm="excluirModelo">
      Remover o modelo {{ modeloSelecionado?.modelo }}?
    </JanelaConfirmacao>

    <q-card>
      <q-banner v-if="erro" class="bg-red-1 text-negative" role="alert">
        Não foi possível carregar as marcas.
        <template #action>
          <q-btn flat label="Tentar novamente" @click="carregar" />
        </template>
      </q-banner>

      <div class="q-pa-md">
        <q-input
          v-model="search"
          filled
          dense
          debounce="300"
          placeholder="Pesquisar marca ou modelo"
          @update:model-value="pesquisar"
        >
          <template #before>
            <q-btn
              v-if="pode('veiculos.gerenciar')"
              class="q-mr-sm"
              icon="sell"
              label="NOVA MARCA"
              color="primary"
              @click="abrirMarca(null)"
            />
            <q-btn
              v-if="pode('veiculos.gerenciar')"
              class="q-mr-sm"
              icon="add"
              label="NOVO MODELO"
              color="primary"
              outline
              @click="abrirModelo(null, null)"
            />
            <q-btn-toggle
              v-model="tipo"
              class="q-mr-sm"
              toggle-color="primary"
              :options="[
                { label: 'Todos', value: '' },
                { label: 'Carros', value: 'carro' },
                { label: 'Motos', value: 'moto' },
              ]"
              @update:model-value="pesquisar"
            />
          </template>
          <template v-if="search" #append>
            <q-icon name="close" class="cursor-pointer" @click="limparPesquisa" />
          </template>
        </q-input>
        <div class="text-caption text-grey-7 q-mt-sm">
          {{ resumo }}
        </div>
      </div>
      <q-linear-progress v-if="carregando" indeterminate />
      <q-separator v-else />

      <div v-if="carregando && !marcas.length" class="text-center q-pa-xl">
        <q-spinner color="primary" size="40px" />
      </div>
      <div v-else-if="!marcas.length && !erro" class="text-center text-grey-7 q-pa-xl">
        Nenhuma marca encontrada.
      </div>

      <q-list separator>
        <q-expansion-item
          v-for="marca in marcas"
          :key="marca.id"
          group="marcas"
          expand-separator
          @before-show="abrir(marca)"
          @before-hide="abertas.delete(marca.id)"
        >
          <template #header>
            <q-item-section avatar>
              <q-avatar rounded color="primary" text-color="white" icon="sell" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ marca.nome }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center no-wrap q-gutter-xs">
                <q-badge color="grey-7" :label="rotuloQuantidade(marca.modelos_count)" />
                <template v-if="pode('veiculos.gerenciar')">
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    aria-label="Editar marca"
                    @click.stop="abrirMarca(marca)"
                  >
                    <q-tooltip>Editar marca</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    aria-label="Remover marca"
                    @click.stop="confirmarMarca(marca)"
                  >
                    <q-tooltip>Remover marca</q-tooltip>
                  </q-btn>
                </template>
              </div>
            </q-item-section>
          </template>

          <div v-if="modelosPorMarca[marca.id]" class="q-pa-md bg-grey-1">
            <div v-if="pode('veiculos.gerenciar')" class="q-mb-sm">
              <q-btn
                dense
                no-caps
                color="primary"
                icon="add"
                :label="`Novo modelo da ${marca.nome}`"
                @click="abrirModelo(null, marca.id)"
              />
            </div>

            <q-banner
              v-if="modelosPorMarca[marca.id].erro"
              class="bg-red-1 text-negative"
              role="alert"
            >
              Não foi possível carregar os modelos.
              <template #action>
                <q-btn flat label="Tentar novamente" @click="carregarModelos(marca)" />
              </template>
            </q-banner>
            <q-table
              v-else
              flat
              bordered
              dense
              :rows="modelosPorMarca[marca.id].linhas"
              :columns="columns"
              row-key="id"
              v-model:pagination="modelosPorMarca[marca.id].paginacao"
              :rows-per-page-options="[10, 25, 50]"
              :loading="modelosPorMarca[marca.id].carregando"
              loading-label="Carregando modelos…"
              no-data-label="Esta marca não tem modelos."
            >
              <template #body-cell-tipo="props">
                <q-td :props="props">
                  <q-badge
                    :color="props.row.tipo === 'moto' ? 'orange' : 'primary'"
                    :label="props.row.tipo === 'moto' ? 'Moto' : 'Carro'"
                  />
                </q-td>
              </template>
              <template #body-cell-acoes="props">
                <q-td :props="props" auto-width>
                  <template v-if="pode('veiculos.gerenciar')">
                    <q-btn
                      flat
                      dense
                      icon="edit"
                      aria-label="Editar modelo"
                      @click="abrirModelo(props.row, marca.id)"
                    >
                      <q-tooltip>Editar</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      icon="delete"
                      aria-label="Remover modelo"
                      @click="confirmarModelo(props.row)"
                    >
                      <q-tooltip>Remover</q-tooltip>
                    </q-btn>
                  </template>
                </q-td>
              </template>
            </q-table>
          </div>
        </q-expansion-item>
      </q-list>

      <template v-if="ultimaPagina > 1">
        <q-separator />
        <div class="flex flex-center q-pa-md">
          <q-pagination
            v-model="pagina"
            color="primary"
            :max="ultimaPagina"
            :max-pages="7"
            boundary-links
            direction-links
            @update:model-value="carregar"
          />
        </div>
      </template>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'src/stores/auth'
import JanelaConfirmacao from 'src/components/JanelaConfirmacao.vue'
import FormularioMarcaVeiculo from 'src/components/veiculos/FormularioMarcaVeiculo.vue'
import FormularioModeloVeiculo from 'src/components/veiculos/FormularioModeloVeiculo.vue'

const { pode } = useAuthStore()
const $q = useQuasar()

const marcas = ref([])
const pagina = ref(1)
const ultimaPagina = ref(1)
const totalMarcas = ref(0)
const totalModelos = ref(0)
const search = ref('')
const tipo = ref('')
const carregando = ref(false)
const erro = ref(false)
const marcaAberta = ref(false)
const modeloAberto = ref(false)
const confirmandoMarca = ref(false)
const confirmandoModelo = ref(false)
const marcaSelecionada = ref(null)
const modeloSelecionado = ref(null)
const marcaParaNovoModelo = ref(null)
// modelos já buscados de cada marca; some quando algo muda ou o filtro muda
const modelosPorMarca = reactive({})
// marcas abertas agora, para recarregar os modelos delas depois de uma alteração
const abertas = new Set()
let consulta = null

// serviços sem ano ficam com traço: o modelo não atende
const anoOuTraco = (ano) => ano ?? '—'
const columns = [
  { name: 'modelo', label: 'Modelo', field: 'modelo', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  {
    name: 'entrega',
    label: 'Entrega',
    field: (linha) => anoOuTraco(linha.ano_minimo_entrega),
    align: 'center',
  },
  {
    name: 'corrida',
    label: 'Corrida / Moto',
    field: (linha) => anoOuTraco(linha.ano_minimo_corrida),
    align: 'center',
  },
  {
    name: 'eletrico',
    label: 'Elétrico',
    field: (linha) => anoOuTraco(linha.ano_minimo_eletrico),
    align: 'center',
  },
  { name: 'acoes', label: 'Ações', align: 'center' },
]

const filtros = () => ({ search: search.value || undefined, tipo: tipo.value || undefined })
const filtrosMarcas = () => ({ ...filtros(), page: pagina.value })
const rotuloQuantidade = (total) => `${total} ${total === 1 ? 'modelo' : 'modelos'}`
const resumo = computed(() => {
  const marcasTexto = `${totalMarcas.value} ${totalMarcas.value === 1 ? 'marca' : 'marcas'}`
  const paginas = ultimaPagina.value > 1 ? ` · página ${pagina.value} de ${ultimaPagina.value}` : ''
  return `${marcasTexto} · ${rotuloQuantidade(totalModelos.value)}${paginas}`
})

const novoEstado = () => ({
  linhas: [],
  carregando: false,
  carregado: false,
  erro: false,
  paginacao: { page: 1, rowsPerPage: 10 },
})

async function carregar() {
  consulta?.abort()
  const atual = new AbortController()
  consulta = atual
  carregando.value = true
  erro.value = false
  try {
    const { data } = await api.get('/marcas-veiculos', {
      params: filtrosMarcas(),
      signal: atual.signal,
    })
    if (atual.signal.aborted) return
    // a última marca da página foi removida: volta para a página anterior
    if (!data.data.length && pagina.value > 1 && data.last_page >= 1) {
      pagina.value = data.last_page
      return carregar()
    }
    marcas.value = data.data
    totalMarcas.value = data.total
    totalModelos.value = data.modelos_total
    ultimaPagina.value = data.last_page
    for (const id of [...abertas])
      if (!marcas.value.some((marca) => marca.id === id)) abertas.delete(id)
    // o filtro mudou o que cada marca mostra: o que já foi buscado vale de novo só depois de
    // uma nova busca, feita já para as marcas abertas
    for (const estado of Object.values(modelosPorMarca)) estado.carregado = false
    for (const marca of marcas.value) if (abertas.has(marca.id)) carregarModelos(marca)
  } catch {
    if (atual.signal.aborted) return
    marcas.value = []
    totalMarcas.value = 0
    totalModelos.value = 0
    ultimaPagina.value = 1
    erro.value = true
  } finally {
    if (consulta === atual && !atual.signal.aborted) carregando.value = false
  }
}

async function carregarModelos(marca) {
  const estado = modelosPorMarca[marca.id]
  estado.carregando = true
  estado.erro = false
  try {
    const { data } = await api.get(`/marcas-veiculos/${marca.id}/modelos`, { params: filtros() })
    estado.linhas = data.data
    estado.carregado = true
  } catch {
    estado.erro = true
  } finally {
    estado.carregando = false
  }
}

function abrir(marca) {
  abertas.add(marca.id)
  // o conteúdo da marca só passa a existir aqui, para não montar uma tabela por marca
  modelosPorMarca[marca.id] ??= novoEstado()
  if (!modelosPorMarca[marca.id].carregado) carregarModelos(marca)
}

const recarregar = () => carregar()

function pesquisar() {
  pagina.value = 1
  carregar()
}

function limparPesquisa() {
  search.value = ''
  pesquisar()
}

function abrirMarca(marca) {
  marcaSelecionada.value = marca
  marcaAberta.value = true
}

function abrirModelo(modelo, marcaId) {
  modeloSelecionado.value = modelo
  marcaParaNovoModelo.value = marcaId
  modeloAberto.value = true
}

function confirmarMarca(marca) {
  marcaSelecionada.value = marca
  confirmandoMarca.value = true
}

function confirmarModelo(modelo) {
  modeloSelecionado.value = modelo
  confirmandoModelo.value = true
}

async function remover(url, falha) {
  try {
    const { data } = await api.delete(url)
    $q.notify({ type: 'positive', message: data.message })
    await carregar()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || falha })
  }
}

const excluirMarca = () =>
  remover(`/marcas-veiculos/${marcaSelecionada.value.id}`, 'Não foi possível remover a marca.')
const excluirModelo = () =>
  remover(`/modelos-veiculos/${modeloSelecionado.value.id}`, 'Não foi possível remover o modelo.')

onMounted(carregar)
onBeforeUnmount(() => consulta?.abort())
</script>
