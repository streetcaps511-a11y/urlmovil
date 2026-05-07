/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import axios from 'axios';

// 🔗 API CONFIG - Usamos IP directa para evitar problemas de resolución de 'localhost'
// 🔗 API CONFIG - Estrategia de Triple Conexión (Resiliencia Total)
// 🌐 ESTRATEGIA DE CONEXIÓN TRIPLE (Resiliencia Total)
// 🌐 ESTRATEGIA DE CONEXIÓN ULTRA-ESTABLE (Prioridad 127.0.0.1)
const getDynamicBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // 'localhost' es más compatible con Windows y CORS en la mayoría de los casos
  return 'http://localhost:3000';
};

export const API_BASE_URL = getDynamicBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json' 
  },
  timeout: 60000, // 🕒 Aumentado a 60s para dar tiempo a la base de datos en la nube (Aiven)
});

// 🔐 Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    let token = sessionStorage.getItem('token');
    
    // Fallback por si el token está dentro del objeto user
    if (!token) {
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          token = userObj.token || userObj.accessToken || userObj.Token;
        } catch { /* ignoramos error de parseo */ }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 Interceptor de respuesta mejorado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el servidor da 401 y no es una ruta pública, cerramos sesión
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/auth/');
      const isSessionInvalidated = error.response?.data?.isSessionInvalidated;

      // 🔐 CASO 1: Sesión abierta en otro lugar (Evento Global)
      if (isSessionInvalidated) {
        console.warn('⚠️ Se detectó una sesión abierta en otro lugar.');
        window.dispatchEvent(new CustomEvent('session-conflict'));
        return Promise.reject(error); // El modal de AuthContext se encargará de bloquear
      }

      // 🔐 CASO 2: Token expirado o inválido general
      if (!isAuthRoute) {
        sessionStorage.clear();
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
