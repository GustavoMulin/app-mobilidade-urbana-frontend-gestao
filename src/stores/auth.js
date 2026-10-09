import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  let refreshPromise = null

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value)
  const getUser = computed(() => user.value)

  // --- ACTIONS ---

  // Função para buscar dados do usuário logado
  async function fetchUser() {
    try {
      const response = await api.get('/usuario-logado')
      user.value = response.data
      return response
    } catch (error) {
      clearSession()
      throw error
    }
  }

  // Função de login
  async function login(credentials) {
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
    login,
    logout,
    clearSession,
    refreshToken,
    fetchUser,
  }
})
