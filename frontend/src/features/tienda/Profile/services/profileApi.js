/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import api from "../../../shared/services/api";

/**
 * Fetch products for selection in returns form
 */
export const getProducts = async () => {
  try {
    const response = await api.get('/api/productos?todos=true');
    // Soporta tanto array directo como objeto { data: { products: [] } }
    const resData = response.data?.data;
    const data = Array.isArray(resData) ? resData : (resData?.products || resData?.rows || resData || []);
    
    return data.map(p => ({
      id: p.id,
      nombre: p.nombre,
      precio: (p.enOfertaVenta && Number(p.precioOferta) > 0) ? Number(p.precioOferta) : Number(p.precioVenta || p.precio),
      tallas: Array.isArray(p.tallasStock) 
        ? p.tallasStock.filter(ts => Number(ts.cantidad) > 0).map(ts => ts.talla)
        : (p.tallas || [])
    }));
  } catch (error) {
    console.error("Error fetching products for profile:", error);
    return [];
  }
};

/**
 * Update user profile data
 * @param {Object} userData 
 */
export const updateProfile = async (userData) => {
  try {
    const response = await api.put('/api/clientes/mi/perfil', userData);
    return response.data; // { success: true, data: updatedUser }
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

/**
 * Fetch current client profile
 */
export const getMiPerfil = async () => {
    try {
        const res = await api.get('/api/clientes/mi/perfil');
        return res.data?.data;
    } catch (error) {
        console.error("Error fetching perfil:", error);
        return null;
    }
}

/**
 * Fetch orders for the logged-in user
 */
export const getMyOrders = async () => {
  try {
    const response = await api.get('/api/ventas/mis-pedidos');
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching my orders:", error);
    return [];
  }
};

/**
 * Fetch returns for the logged-in user
 */
export const getMyReturns = async () => {
  try {
    const response = await api.get('/api/devoluciones/mis-devoluciones');
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching my returns:", error);
    return [];
  }
};

/**
 * Create a new return/warranty request
 */
export const createReturn = async (returnData) => {
  try {
    const response = await api.post('/api/devoluciones', returnData);
    return response.data;
  } catch (error) {
    console.error("Error creating return:", error);
    throw error;
  }
};

// Add other profile-related API calls here as they become available in the backend
export const deactivateAccount = async () => {
  try {
    const response = await api.post('/api/usuarios/perfil/desactivar');
    return response.data;
  } catch (error) {
    console.error("Error deactivating account:", error);
    throw error;
  }
};

export const deleteAccountPermanently = async () => {
  try {
    const response = await api.delete('/api/usuarios/perfil/eliminar-permanente');
    return response.data;
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

export const markOrderAsReceived = async (orderId) => {
  try {
    const rawId = String(orderId).replace('PED-', '');
    const id = parseInt(rawId) > 10000 ? parseInt(rawId) - 10000 : rawId;
    const response = await api.patch(`/api/ventas/${id}/marcar-recibido`);
    return response.data;
  } catch (error) {
    console.error("Error marking order as received:", error);
    throw error;
  }
};
