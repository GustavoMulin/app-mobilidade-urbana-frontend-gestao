<template>
  <div>
    <q-dialog v-model="model" @before-show="onBeforeShow" @before-hide="beforeHide">
      <q-card style="width: 700px; max-width: 80vw">
        <q-stepper v-model="step" ref="stepper" color="primary" animated>
          <q-step
            class="q-pa-none"
            :name="1"
            title="Selecione o usuário"
            icon="settings"
            :done="step > 1"
          >
            <!-- <q-card> -->
            <q-table
              flat
              :rows="usuarios.data"
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
                  @keyup.enter="buscarDados"
                >
                  <template v-if="search" #append>
                    <q-icon name="close" class="cursor-pointer" @click="clearSearch" />
                  </template>
                </q-input>
              </template>

              <template #body="props">
                <q-tr @click="selectRow(props.row)" class="cursor-pointer" :props="props">
                  <q-td key="id">{{ props.row.id }}</q-td>

                  <q-td key="motorista">
                    <q-item>
                      <q-item-section top avatar>
                        <q-avatar v-if="props.row.foto_thumbnail">
                          <img :src="props.row.foto" />
                        </q-avatar>
                        <q-avatar v-else color="primary" text-color="white">
                          {{ props.row.name.substr(0, 1) }}
                        </q-avatar>
                        <q-badge class="q-mt-sm" :color="badgeColor(props.row.status)">
                          {{ props.row.status }}
                        </q-badge>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="text-bold"> {{ props.row.name }}</q-item-label>
                        <q-item-label class="estilo-coluna">
                          {{ props.row.email }}
                          <div>CPF: {{ props.row.cpf }}</div>
                          <div>TEL: {{ props.row.telefone }}</div>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-td>
                  <q-td key="acoes">
                    <q-icon color="grey" size="sm" name="arrow_forward_ios" />
                  </q-td>
                </q-tr>
              </template>
            </q-table>
            <!-- </q-card> -->
          </q-step>

          <q-step :name="2" title="Confirmar registro" icon="upload_file" :done="step > 2">
            <div class="q-pa-md">
              <q-icon
                @click="$refs.stepper.previous()"
                size="30px"
                name="arrow_back"
                color="primary"
                class="cursor-pointer"
              />
              <q-card-section>
                <CardPerfilUsuario :usuario="usuario" />
                <div class="row">
                  <div class="col-md-6 col-12">
                    <q-item>
                      <q-input
                        class="full-width"
                        v-model="usuario.cnh_numero"
                        label="Número CNH *"
                        outlined
                        dense
                        :rules="[(val) => val.length >= 11 || 'Campo obrigatório']"
                        onkeypress="return /[0-9]/i.test(event.key)"
                        maxlength="11"
                      />
                    </q-item>
                  </div>
                  <div class="col-md-6 col-12">
                    <q-item>
                      <q-select
                        v-model="usuario.cnh_categoria"
                        dense
                        outlined
                        class="full-width"
                        label="Categoria CNH *"
                        :options="CnhCategorias"
                        map-options
                        :rules="[(val) => !!val || 'Campo obrigatório']"
                      />
                    </q-item>
                  </div>
                  <div class="col-md-6 col-12">
                    <q-item>
                      <q-input
                        class="full-width"
                        label="Expiração CNH"
                        dense
                        mask="##/##/####"
                        outlined
                        v-model="usuario.cnh_expiracao"
                        :rules="[(data_inicial) => validateDateFormat(data_inicial)]"
                      >
                        <template v-slot:append>
                          <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy
                              ref="qDateProxy"
                              transition-show="scale"
                              transition-hide="scale"
                            >
                              <q-date
                                v-model="usuario.cnh_expiracao"
                                mask="DD/MM/YYYY"
                                @input="() => inputData()"
                              ></q-date>
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </q-item>
                  </div>

                  <div class="col-md-6 col-12">
                    <q-checkbox
                      size="md"
                      :true-value="1"
                      :false-value="0"
                      v-model="usuario.ear"
                      label="POSSIU EAR"
                    />
                  </div>
                </div>
                <div align="center">
                  <q-btn
                    icon-right="done"
                    label="CRIAR MOTORISTA"
                    color="primary"
                    class="q-mt-md"
                    @click="criarMotorista()"
                  />
                </div>
              </q-card-section>
            </div>
          </q-step>

          <template v-slot:message>
            <q-banner v-if="step === 1 || step === 2" class="bg-primary text-white q-px-lg">
              Criar novo morista
            </q-banner>
          </template>
        </q-stepper>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import CardPerfilUsuario from 'src/components/usuarios/CardPerfilUsuario.vue'
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import moment from 'moment'

// PROPS
const props = defineProps({
  modelValue: Boolean,
})

// EMITS
const emit = defineEmits(['update:modelValue', 'created'])

// Q
const $q = useQuasar()

// MODEL
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
const step = ref(1)

const usuarios = ref({
  success: true,
  data: [],
})

const CnhCategorias = ref(['A', 'B'])

const usuario = ref({
  cnh_numero: '',
  cnh_categoria: '',
  cnh_expiracao: '',
  ear: 0,
})

const pagination = ref({
  page: 1,
  rowsPerPage: 5,
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'motorista', label: 'Nome', field: 'name', align: 'left' },
  { name: 'acoes', label: '', align: 'center' },
]

const badgeColor = (status) => {
  if (status === 'aprovado') return 'green'
  if (status === 'suspenso') return 'orange'
  if (status === 'banido') return 'red'
}

function validateDateFormat(date) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/

  if (!date) return true

  if (!regex.test(date)) {
    return 'Formato de data inválido (DD/MM/YYYY)'
  }

  const [day, month, year] = date.split('/').map(Number)

  // Verificar se o dia está no intervalo de 1 a 31 (dependendo do mês)
  if (day < 1 || day > 31) {
    return 'Dia inválido'
  }

  // Verificar se o mês está no intervalo de 1 a 12
  if (month < 1 || month > 12) {
    return 'Mês inválido'
  }

  // Verificar se o ano é maior que 0 (não negativo)
  if (year <= 0) {
    return 'Ano inválido'
  }

  // Verificar se o dia é válido para o mês (considerando anos bissextos)
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) {
    return 'Dia inválido para o mês selecionado'
  }

  return true
}

const loading = ref(null)
const search = ref('')
const stepper = ref(null)

function beforeHide() {}

function selectRow(row) {
  usuario.value = {
    cnh_numero: usuario.value.cnh_numero ?? '',
    cnh_categoria: usuario.value.cnh_categoria ?? '',
    cnh_expiracao: usuario.value.cnh_expiracao ?? '',
    ear: usuario.value.ear ?? 0,
    ...row,
  }
  stepper.value.next()
}

function onBeforeShow() {
  // simulação
  step.value = 1
  limparForm()
  console.log(onBeforeShow)
  buscarDados()
}
const criarMotorista = async () => {
  const dataFormatada = usuario.value.cnh_expiracao
    ? moment(usuario.value.cnh_expiracao, 'DD/MM/YYYY').format('YYYY/MM/DD')
    : null
  api
    .post('/motoristas', {
      user_id: usuario.value?.id,
      cnh_numero: usuario.value?.cnh_numero,
      cnh_categoria: usuario.value?.cnh_categoria,
      cnh_expiracao: dataFormatada,
      ear: usuario.value.ear,
    })
    .then((res) => {
      $q.notify({ type: 'positive', message: res.data.message })
      emit('created')
      model.value = false
    })
    .catch((err) => {
      console.log(err, 'err')
      $q.notify({ type: 'negative', message: err.response?.data?.message })
    })
}

function limparForm() {
  usuario.value = {
    cnh_numero: '',
    cnh_categoria: '',
    cnh_expiracao: '',
    ear: 0,
  }
}
const buscarDados = async (props) => {
  loading.value = true
  const { page, rowsPerPage } = props ? props.pagination : pagination
  try {
    const response = await api.get(`users`, {
      params: {
        search: search.value || '',
        page: page,
        rowsPerPage: rowsPerPage,
      },
    })

    const data = response.data

    usuarios.value = {
      success: true,
      data: data.data, // array de usuários
    }

    pagination.value.rowsNumber = data.total
    pagination.value.page = data.current_page
    pagination.value.rowsPerPage = data.per_page === data.total ? 0 : data.per_page
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
const onRequest = async (props) => {
  console.log(props, 'props')
  await buscarDados(props)
}
</script>

<style lang="scss" scoped>
:deep(.q-stepper__step-inner) {
  padding: 0 !important;
}
</style>
