import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'
import { disconnectEcho } from 'src/services/echo'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  let refreshPromise = null

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value)
  const getUser = computed(() => user.value)
  const permissoes = computed(() => user.value?.permissoes || [])
  function pode(permissao) {
    return permissoes.value.includes(permissao)
  }

  // --- ACTIONS ---

  // Função para buscar dados do usuário logado
  async function fetchUser() {
    try {
      const response = await api.get('/usuario-logado')
      user.value = response.data
      return response
    } catch (error) {
      if (error.response?.status === 401) clearSession()
      throw error
    }
  }

  // Função de login
  async function login(credentials) {
    disconnectEcho()
    const response = await api.post('auth/login', credentials)
    const newToken = response.data.token

    // Guarda o token
    setToken(newToken)

    // Busca dados do usuário
    await fetchUser()

    return response
  }

  // Logout
  function clearSession() {
    disconnectEcho()
    user.value = null
    setToken(null)
  }

  async function logout() {
    try {
      if (token.value) await api.post('auth/logout')
    } finally {
      clearSession()
    }
  }

  function refreshToken() {
    if (!refreshPromise) {
      refreshPromise = api
        .post('auth/refresh')
        .then(({ data }) => {
          setToken(data.token)
          return data.token
        })
        .finally(() => {
          refreshPromise = null
        })
    }
    return refreshPromise
  }

  // Define ou remove o token
  function setToken(newToken) {
    token.value = newToken

    if (newToken) {
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    getUser,
    permissoes,
    pode,
    login,
    logout,
    clearSession,
    refreshToken,
    fetchUser,
  }
})
