<template>
  <div :class="$q.dark.isActive ? 'dark_mode' : ''">
    <q-dialog v-model="model" @before-show="onBeforeShow" @before-hide="quandoDialogFechar">
      <q-card style="width: 700px; max-width: 80vw" class="row q-col-gutter-sm">
        <q-card-section>
          <q-form @submit.prevent="onSubmit">
            <div class="row">
              <!-- IMAGEM -->
              <div class="col-12">
                <q-card-section class="flex justify-center">
                  <q-avatar size="12rem" v-if="imagemProfile">
                    <q-img ratio="1" :src="imagemProfile">
                      <div class="flex caption absolute-full text-h5 flex-center">
                        <span class="btn fileinput-button">
                          <q-icon name="photo_camera" color="white" />
                          <br />Alterar<br />imagem
                          <input type="file" @change="imageSelected" />
                        </span>
                      </div>
                    </q-img>
                  </q-avatar>

                  <q-avatar v-else color="primary" size="12rem">
                    <div class="flex absolute-full text-h5 flex-center">
                      <span class="btn fileinput-button">
                        <q-icon name="add_photo_alternate" size="40px" color="white" />
                        <br />Adicionar<br />imagem
                        <input type="file" @change="imageSelected" />
                      </span>
                    </div>
                  </q-avatar>
                </q-card-section>

                <div class="flex justify-center">
                  <q-btn
                    v-if="imagemProfile"
                    flat
                    icon="close"
                    color="primary"
                    label="REMOVER IMAGEM"
                    @click="removerImagem"
                  />
                </div>
              </div>
            </div>

            <div class="row">
              <!-- INPUTS -->
              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="usuario.name"
                    label="Nome completo *"
                    outlined
                    dense
                    :rules="[(val) => val.length >= 3 || 'Campo obrigatório']"
                  />
                </q-item>
              </div>

              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="usuario.telefone"
                    label="Telefone *"
                    outlined
                    dense
                    mask="(##) ##### - ####"
                    :rules="[(val) => val.length >= 17 || 'Campo obrigatório']"
                  />
                </q-item>
              </div>

              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="usuario.cpf"
                    label="CPF *"
                    outlined
                    dense
                    mask="###.###.###-##"
                    :rules="[(val) => val.length >= 14 || 'Campo obrigatório']"
                  />
                </q-item>
              </div>

              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    label="Data Nascimento"
                    dense
                    mask="##/##/####"
                    outlined
                    v-model="usuario.data_nascimento"
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
                            v-model="usuario.data_nascimento"
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
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="usuario.email"
                    label="Email *"
                    outlined
                    dense
                    :rules="[(val) => val.length >= 1 || 'Campo obrigatório']"
                  />
                </q-item>
              </div>
              <div class="col-md-6 col-12">
                <q-item>
                  <q-input
                    class="full-width"
                    v-model="usuario.password"
                    label="Senha"
                    type="password"
                    outlined
                    dense
                    :rules="[(val) => val.length >= 3 || 'Campo obrigatório']"
                  />
                </q-item>
              </div>
            </div>
            <q-card-actions class="q-mt-md" align="center">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn type="submit" color="primary" icon-right="save" label="Salvar" />
              <q-btn
                @click="preecherDados"
                color="green"
                icon-right="edit"
                label="Preencher dados"
              />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
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

const image = ref(null)
const imagemProfile = ref('')

// FORM
const usuario = reactive({
  name: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  email: '',
  password: '',
  type: '',
})

// METHODS
function quandoDialogFechar() {
  limparForm()
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

function limparForm() {
  image.value = null
  imagemProfile.value = ''
  Object.assign(usuario, {
    name: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    email: '',
    password: '',
  })
}

function onBeforeShow() {
  // simulação
  console.log(onBeforeShow)
}

function imageSelected(e) {
  const file = e.target.files?.[0]

  if (!file) {
    console.warn('Nenhuma imagem selecionada')
    return
  }

  image.value = file

  const reader = new FileReader()
  reader.onload = (ev) => {
    imagemProfile.value = ev.target.result
  }
  reader.readAsDataURL(file)
}

function removerImagem() {
  imagemProfile.value = ''
  image.value = null
}

function onSubmit() {
  cadastrarUsuario()
}

function preecherDados() {
  Object.assign(usuario, {
    name: 'name',
    telefone: '69981400661',
    cpf: '11149897291',
    data_nascimento: '21/11/1992',
    email: 'mail@mail.com',
    password: '123',
    type: 'motorista',
  })
}

function cadastrarUsuario() {
  // 📅 FORMATAR DATA (DD/MM/YYYY → YYYY/MM/DD)
  console.log(usuario, 'usuario data1')

  const dataFormatada = usuario.data_nascimento
    ? moment(usuario.data_nascimento, 'DD/MM/YYYY').format('YYYY/MM/DD')
    : null
  console.log(usuario, 'usuario data2')

  // 🧼 LIMPAR CPF (remove tudo que não for número)
  const cpfLimpo = usuario.cpf ? usuario.cpf.replace(/\D/g, '') : ''

  const data = new FormData()

  if (image.value) data.append('image', image.value)

  // CLONE para não alterar o objeto original
  const payload = {
    ...usuario,
    data_nascimento: dataFormatada,
    cpf: cpfLimpo,
  }

  Object.keys(payload).forEach((key) => {
    data.append(key, payload[key] ?? '')
  })

  api
    .post('/users', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => {
      $q.notify({ type: 'positive', message: res.data.message })
      emit('created')
      model.value = false
    })
    .catch((err) => {
      $q.notify({ type: 'negative', message: err.response?.data?.message })
    })
}
</script>

<style scoped>
/* CSS ORIGINAL MANTIDO */
.caption {
  opacity: 0;
  transition: linear 1s;
}
.caption:hover {
  opacity: 1;
}
.btn {
  display: inline-block;
  padding: 6px 12px;
  margin-bottom: 0;
  font-size: 25px;
  font-weight: normal;
  line-height: 1.42857143;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  border-radius: 4px;
}
.btn-success {
  color: #fff;
}
.fileinput-button {
  position: relative;
  overflow: hidden;
}
.fileinput-button input {
  position: absolute;
  top: 0;
  right: 0;
  margin: 0;
  opacity: 0;
  font-size: 200px;
  cursor: pointer;
}
</style>
