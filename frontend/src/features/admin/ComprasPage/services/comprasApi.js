/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import {
  getCompras,
  createCompra,
  getProveedores,
  getMetodosPago,
  getTallas,
  getEstados,
  getProductos
} from '../../../shared/services/adminApi';
import api from "../../../shared/services/api";

export const mapCompraData = (o) => ({
  id: o.IdCompra || o.id,
  numCompra: o.IdCompra || o.id,
  proveedor: o.proveedorData?.companyName || o.proveedor || (o.Proveedor ? o.Proveedor.Nombre : ''),
  fecha: (o.Fecha || o.fecha) ? new Date(o.Fecha || o.fecha).toLocaleDateString('es-CO') : '',
  total: parseFloat(o.Total || o.total || 0),
  metodo: o.metodoPago || o.MetodoPago || '',
  estado: o.Estado || o.estado || '',
  numeroRecibo: o.numeroRecibo || o.NumeroRecibo || '',
  fechaRegistro: (o.FechaRegistro || o.fechaRegistro) ? new Date(o.FechaRegistro || o.fechaRegistro).toLocaleDateString('es-CO') : '',
  productos: (o.detalles || o.productos || []).map(p => {
    // ⚡ SOPORTE PARA NUEVO FORMATO CONSOLIDADO (JSON)
    const variantesConsolidadas = p.variantes || p.Variantes || [];
    
    return {
      ...p,
      nombre: p.nombreProducto || p.NombreProducto || p.nombre || '',
      talla: p.talla || p.Talla || '',
      cantidad: p.cantidad || p.Cantidad || 0,
      variantes: variantesConsolidadas.length > 0 
        ? variantesConsolidadas 
        : [{ talla: p.talla || p.Talla || '', cantidad: p.cantidad || p.Cantidad || 0 }],
      precioCompra: p.precioCompra?.toString() || p.PrecioCompra?.toString() || p.precio?.toString() || '0',
      precioVenta: p.precioVenta?.toString() || p.PrecioVenta?.toString() || '0',
      precioMayorista6: p.precioMayorista6?.toString() || p.PrecioMayorista6?.toString() || '0',
      precioMayorista80: p.precioMayorista80?.toString() || p.PrecioMayorista80?.toString() || '0'
    };
  }),
  isActive: o.IsActive !== undefined ? o.IsActive : true
});

export const fetchAllCompras = async () => {
  try {
    const response = await getCompras();
    const data = response?.data?.data || response?.data || [];
    return (Array.isArray(data) ? data : []).map(mapCompraData);
  } catch (error) {
    console.error('Error fetching compras:', error);
    throw error;
  }
};

export const createNewCompra = async (compraData) => {
  try {
    // Basic mapping for API payload
    // Convert from DD/MM/YYYY to YYYY-MM-DD if needed
    const formatDate = (d) => {
      if (!d || !d.includes('/')) return d;
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return d;
    };

    const payload = {
      idProveedor: compraData.idProveedor,
      metodoPago: compraData.metodoPago,
      fecha: formatDate(compraData.fecha),
      estado: compraData.estado,
      total: compraData.total,
      numeroRecibo: compraData.numeroRecibo,
      fechaRegistro: formatDate(compraData.fechaRegistro),
      productos: compraData.productos.map(p => ({
        idProducto: p.id,
        nombre: p.nombre,
        talla: p.talla,
        cantidad: p.cantidad,
        precioCompra: parseFloat(p.precioCompra),
        precioVenta: parseFloat(p.precioVenta),
        precioMayorista6: parseFloat(p.precioMayorista6),
        precioMayorista80: parseFloat(p.precioMayorista80)
      }))
    };
    const response = await createCompra(payload);
    return response?.data?.data || response?.data;
  } catch (error) {
    console.error('Error creating compra:', error);
    throw error;
  }
};



export const updateCompraStatus = async (id, estado) => {
  try {
    const response = await api.patch(`/api/compras/${id}/status`, { estado });
    return response?.data;
  } catch (error) {
    console.error('Error updating compra status:', error);
    throw error;
  }
};

export const fetchAllProveedores = async () => {
  try {
    const response = await getProveedores();
    const data = response?.data?.data || response?.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    throw error;
  }
};

export const getStatuses = async () => {
  const res = await getEstados(); 
  return res.data?.data || res.data || [];
};

export const getPaymentMethods = async () => {
  const res = await getMetodosPago();
  return res.data?.data || res.data || [];
};

export const getSizes = async () => {
  const res = await getTallas();
  return res.data?.data || res.data || [];
};

export const fetchAllProductos = async () => {
  try {
    const res = await getProductos();
    const raw = res.data?.data || res.data;
    // El backend devuelve { products: [...], count: ... } cuando se usa todos=true
    const data = Array.isArray(raw) 
      ? raw 
      : (raw.products || raw.rows || []);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching productos for compras:', error);
    return [];
  }
};
