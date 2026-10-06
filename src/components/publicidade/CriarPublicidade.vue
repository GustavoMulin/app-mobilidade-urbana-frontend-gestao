<template>
  <section>
    <q-dialog v-model="model" @before-hide="beforeHide" @before-show="beforeShow">
      <q-card style="width: 700px; max-width: 80vw">
        <!-- HEADER -->
        <q-toolbar>
          <!--
          <q-avatar
            rounded
            size="lg"
            icon="file_present"
            color="primary"
            text-color="white"
          />
          -->

          <q-toolbar-title>
            <span class="text-weight-bold">Criar anúncio</span>
          </q-toolbar-title>

          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>

        <q-separator />

        <div class="q-pa-md">
          <q-card-section>
            <div class="row">
              <!-- INPUTS -->
              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="banner.titulo"
                    label="Título"
                    outlined
                    dense
                    :rules="[(val) => (val && val.length >= 3) || 'Campo obrigatório']"
                  />
                </q-item>
              </div>

              <div class="col-md-6 col-12">
                <q-item>
                  <q-select
                    v-model="banner.cidade"
                    dense
                    outlined
                    class="full-width"
                    label="Cidade"
                    :options="cidades"
                    use-input
                    option-label="nome"
                    option-value="id"
                    emit-value
                    map-options
                    :rules="[(val) => !!val || 'Campo obrigatório']"
                    @filter="filter"
                    clearable
                  />
                </q-item>
              </div>
            </div>

            <q-file
              class="q-mt-lg"
              filled
              bottom-slots
              v-model="file"
              label="Selecione o arquivo"
              counter
              max-files="1"
            >
              <template v-slot:before>
                <q-icon name="upload_file" />
              </template>

              <template v-slot:append>
                <q-btn round dense flat icon="add" @click.stop.prevent />
              </template>
            </q-file>

            <div class="q-mt-md" align="center">
              <q-btn
                v-if="file"
                @click="request()"
                label="Enviar"
                color="primary"
                class="q-mt-md"
              />
            </div>
          </q-card-section>
        </div>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

// PROPS
const props = defineProps({
  modelValue: Boolean,
})

// EMITS
const emit = defineEmits(['update:modelValue', 'updated'])

// QUASAR
const $q = useQuasar()

// MODEL
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// STATE
const file = ref(null)

const banner = reactive({
  titulo: '',
  cidade: null,
})

const cidades = ref([])
const optCidades = ref([])

// LIFECYCLE
async function beforeShow() {
  try {
    const data = await getCidades()
    cidades.value = [...data]
    optCidades.value = [...data]
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao carregar as cidades.',
    })
  }
}

async function beforeHide() {
  file.value = null
  Object.assign(banner, {
    titulo: '',
    cidade: null,
  })
}

// FILTER DO Q-SELECT
function filter(val, update) {
  update(() => {
    if (!val) {
      cidades.value = [...optCidades.value]
      return
    }
    // Remove acentos para facilitar a pesquisa.
    const texto = removerAcentos(val.toLowerCase().trim())

    cidades.value = optCidades.value.filter((cidade) => {
      const nome = removerAcentos(String(cidade.nome || '').toLowerCase())

      return nome.includes(texto)
    })
  })
}

// Remove acentos
function removerAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ACTION
function request() {
  const data = new FormData()

  if (file.value) {
    data.append('arquivo', file.value)
  }

  data.append('cidade_id', banner.cidade)
  data.append('titulo', banner.titulo)

  api
    .post('/publicidades', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => {
      $q.notify({
        type: 'positive',
        message: res.data.message,
      })

      emit('onRequest')

      model.value = false
    })
    .catch((err) => {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Erro ao criar anúncio.',
      })
    })
}

// API
async function getCidades() {
  const { data } = await api.get('/cidades')

  return data
}
</script>
