/* === SERVICIO API ===
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend.
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import * as adminApi from "../../../shared/services/adminApi";
import apiClient from "../../../shared/services/api";
import {
  getDevoluciones as getDevolucionesOriginal,
  createDevolucion,
  updateDevolucion,
  getClientes,
  getProductos,
} from "../../../shared/services/adminApi";

const getDevoluciones = getDevolucionesOriginal;

export const mapDevolucionData = (d) => {
  const getImageUrl = (raw) => {
    if (!raw) return null;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    if (typeof raw === "string") {
      if (raw.startsWith("/uploads")) {
        return `${baseUrl}${raw}`;
      }
      if (raw.includes("urlmovil-1.onrender.com")) {
        return raw.replace("https://urlmovil-1.onrender.com", baseUrl);
      }
    }
    return raw;
  };

  // Extraer nombre del estado (Preferir el nombre asociado al modelo Estado)
  const statusName =
    d.estadoDevolucion?.nombre ||
    d.idEstado ||
    d.estado ||
    d.Estado ||
    "Pendiente";

  const displayNoDevolucion = d.noDevolucion || (d.id ? (parseInt(d.id) + 10000).toString() : d.IdDevolucion);
  return {
    id: d.id || d.IdDevolucion || "",
    numDevolucion: displayNoDevolucion,
    noDevolucion: displayNoDevolucion,
    noVenta:
      d.NoVenta ||
      d.noVenta ||
      d.ventaOriginal?.NoVenta ||
      d.ventaOriginal?.noVenta ||
      d.idVenta ||
      "",
    cliente:
      d.nombreCliente ||
      d.ventaOriginal?.clienteData?.nombreCompleto ||
      d.ventaOriginal?.clienteData?.Nombre ||
      "Cliente",
    direccion: d.ventaOriginal?.direccionEnvio || "No especificada",
    idCliente: d.idCliente || d.ventaOriginal?.clienteData?.id || null,
    productoOriginal: d.productoInfo?.nombre || d.productoOriginal || "Gorra",
    productoOriginalId: d.idProducto || d.IdProducto || "",
    productoCambio: d.productoCambio || "",
    productoCambioId: "", // Columna removida para evitar 500
    precio: parseFloat(d.valor || d.Valor || 0),
    motivo: d.motivo || d.Motivo || "",
    fecha:
      d.fecha || d.Fecha
        ? new Date(d.fecha || d.Fecha).toLocaleDateString("es-CO")
        : "",
    estado: statusName,
    evidencia: getImageUrl(d.evidencia || d.Evidencia),
    evidencia2: getImageUrl(d.evidencia2 || d.Evidencia2),
    viewingEvidencia: 1,
    motivoRechazo: d.observacion || d.MotivoRechazo || "",
    idVenta: d.idVenta || d.IdVenta || d.ventaOriginal?.id || "",
    talla: d.talla || d.Talla || "N/A",
    cantidad: d.cantidad || d.Cantidad || 1,
    cantidadOriginal:
      d.cantidadOriginal || d.CantidadOriginal || d.cantidad || d.Cantidad || 1,
    pedidoCompleto: d.pedidoCompleto || d.PedidoCompleto || false,
    idLote: d.idLote || d.IdLote || null,
    isActive: true,
  };
};

export const fetchAllDevoluciones = async () => {
  try {
    const response = await getDevoluciones();
    const data = response?.data?.data || response?.data || [];
    return (Array.isArray(data) ? data : []).map(mapDevolucionData);
  } catch (error) {
    console.error("Error fetching devoluciones:", error);
    return []; // Retornar array vacío en caso de error para evitar crash
  }
};

export const createNewDevolucion = async (devData) => {
  try {
    const payload = {
      idCliente: devData.idCliente,
      idVenta: devData.idVenta,
      idProductoOriginal:
        devData.idProductoOriginal || devData.productoOriginalId,
      idProductoCambio:
        devData.productoCambioId || devData.idProductoCambio || null,
      mismoModelo: devData.mismoModelo,
      motivo: devData.motivo,
      evidencia: devData.evidencia || "",
      evidencia2: devData.evidencia2 || "",
      talla: devData.talla || "N/A",
      precioUnitario: devData.precioUnitario || 0,
      cantidad: devData.cantidad || 1,
      estado: "Pendiente",
      noVenta: devData.idVenta || null,
      fecha: new Date().toISOString(),
    };
    const response = await createDevolucion(payload);
    return response?.data?.data || response?.data;
  } catch (error) {
    console.error("Error creating devolucion:", error);
    throw error;
  }
};

export const updateExistingDevolucion = async (id, devData) => {
  try {
    const payload = {
      estado: devData.Estado || devData.estado,
      motivoRechazo: devData.MotivoRechazo || devData.motivoRechazo,
    };
    console.log("--- ENVIANDO ACTUALIZACION DEVOLUCION ---", { id, payload });
    const response = await updateDevolucion(id, payload);
    return response?.data;
  } catch (error) {
    console.error("Error updating devolucion:", error);
    throw error;
  }
};

export const fetchAllClientes = async () => {
  try {
    const response = await getClientes();
    const data = response?.data?.data || response?.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching clientes:", error);
    return [];
  }
};

export const fetchAllProductosData = async () => {
  try {
    const response = await getProductos();
    let data = response?.data?.data || response?.data || [];
    if (data && typeof data === "object" && !Array.isArray(data)) {
      data = data.products || data.rows || data.data || [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching productos:", error);
    return [];
  }
};

export const fetchVentasPorCliente = async (clienteId) => {
  try {
    const response = await apiClient.get(`/api/ventas/cliente/${clienteId}`);
    const data = response?.data?.data || response?.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching client sales:", error);
    return [];
  }
};

export const getStatuses = async () => {
  try {
    const response = await adminApi.getEstados();
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error("Error fetching statuses:", error);
    throw error;
  }
};
