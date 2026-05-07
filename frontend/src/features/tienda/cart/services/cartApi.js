/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import api from "../../../shared/services/api";

/**
 * Obtiene el perfil actual del cliente desde la base de datos
 */
export const getMiPerfil = () => {
  return api.get("/api/clientes/mi/perfil");
};

/**
 * Obtiene un producto por su ID
 */
export const getProductoById = (id) => {
  return api.get(`/api/productos/${id}`);
};

/**
 * Crea un nuevo pedido/compra en el sistema.
 * @param {Object} orderData - Datos del pedido (cliente, productos, total, comprobante, etc.)
 */
export const createPedido = (orderData) => {
  // El backend espera JSON. El comprobante debe ir como string base64 si existe.
  return api.post('/api/pedidos', orderData);
};
