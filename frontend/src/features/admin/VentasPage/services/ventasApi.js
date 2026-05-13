/* === SERVICIO API ===
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend.
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import * as adminApi from "../../../shared/services/adminApi.js";
import api from "../../../shared/services/api.js";

/**
 * Mapea los datos del backend al formato del frontend
 */
export const mapBackendToFrontend = (v) => {
  if (!v) return null;

  try {
    // El nombre del estado ahora viene en IdEstado (mayúscula) o idEstado (minúscula) como string
    const estadoNombre =
      v.IdEstado || v.idEstado || v.Estado || v.estado || "Pendiente";

    // Extraer el objeto cliente completo de forma ultra-resiliente
    const getClienteInfo = () => {
      try {
        // 1. Intentar capturar el objeto cliente (puede venir anidado)
        const data =
          v.clienteData ||
          v.ClienteData ||
          v.Cliente ||
          (typeof v.cliente === "object" ? v.cliente : null) ||
          {};
        const isObject =
          data && typeof data === "object" && Object.keys(data).length > 0;

        // 2. Extraer campos buscando en el objeto anidado Y en el objeto principal (por si viene plano)
        const nombre =
          (isObject
            ? data.nombreCompleto ||
              data.Nombre ||
              data.nombre ||
              data.nombre_completo
            : null) ||
          v.ClienteNombre ||
          v.clienteNombre ||
          v.NombreCompleto ||
          (typeof v.cliente === "string" ? v.cliente : null) ||
          "Desconocido";

        const doc =
          (isObject
            ? data.numeroDocumento ||
              data.Documento ||
              data.NumeroDocumento ||
              data.num_documento ||
              data.documento
            : null) ||
          v.numeroDocumento ||
          v.Documento ||
          v.num_documento ||
          v.documento ||
          "N/A";

        const correo =
          (isObject
            ? data.email || data.Email || data.correo || data.correoElectronico
            : null) ||
          v.email ||
          v.Email ||
          v.correo ||
          "S/C";

        const tel =
          (isObject
            ? data.telefono || data.Telefono || data.tel || data.celular
            : null) ||
          v.telefono ||
          v.Telefono ||
          v.tel ||
          "N/A";

        return {
          nombre,
          num_documento: doc,
          correo,
          telefono: tel,
        };
      } catch (e) {
        return {
          nombre: "Desconocido",
          num_documento: "N/A",
          correo: "S/C",
          telefono: "N/A",
        };
      }
    };

    // ... (rest of helpers like getEvidencia)
    const getEvidencia = () => {
      try {
        const raw =
          v.comprobante ||
          v.Comprobante ||
          v.ComprobanteUrl ||
          v.evidencia ||
          null;
        if (raw && typeof raw === "string" && raw.startsWith("/uploads")) {
          const baseUrl =
            import.meta.env.VITE_API_URL || "http://localhost:3000";
          return `${baseUrl}${raw}`;
        }
        return raw;
      } catch (e) {
        return null;
      }
    };

    const getEvidencia2 = () => {
      try {
        const raw = v.comprobante2 || v.Comprobante2 || null;
        if (raw && typeof raw === "string" && raw.startsWith("/uploads")) {
          const baseUrl =
            import.meta.env.VITE_API_URL || "http://localhost:3000";
          return `${baseUrl}${raw}`;
        }
        return raw;
      } catch (e) {
        return null;
      }
    };

    return {
      id: v.id || v.IdVenta || Math.random(),
      noVenta: (() => {
        const raw = v.noVenta || v.NoVenta || v.no_venta || v.id || v.IdVenta;
        const num = parseInt(raw);
        return (!isNaN(num) && num < 10000) ? String(10000 + num) : String(raw);
      })(),
      cliente: getClienteInfo(),
      idCliente: v.idCliente || v.IdCliente,
      fecha:
        v.fecha || v.Fecha
          ? new Date(v.fecha || v.Fecha).toLocaleDateString("es-CO")
          : "",
      total: parseFloat(v.total || v.Total || 0) || 0,
      montoPagado: parseFloat(v.montoPagado || v.MontoPagado || 0) || 0,
      monto1: parseFloat(v.monto1 || v.Monto1 || 0) || 0,
      monto2: parseFloat(v.monto2 || v.Monto2 || 0) || 0,
      metodoPago: v.metodoPago || v.MetodoPago || "Efectivo",
      estado: estadoNombre,
      idEstado: v.idEstado || v.IdEstado,
      statusenvio: v.statusenvio || v.StatusEnvio || "Por enviar",
      evidencia: getEvidencia(),
      evidencia2: getEvidencia2(),
      tipoEntrega: v.tipoEntrega || v.TipoEntrega || "envio",
      direccionEnvio: v.direccionEnvio || v.DireccionEnvio || "N/A",
      motivoRechazo: v.motivoRechazo || v.MotivoRechazo || "",
      productos: Array.isArray(v.detalles || v.Productos || v.productos)
        ? (v.detalles || v.Productos || v.productos).map((d) => {
            // Manejar tanto variantes como talla única
            const variantes = Array.isArray(d.variantes)
              ? d.variantes
              : [{ talla: d.talla || "U", cantidad: d.cantidad || 1 }];
            return {
              id: d.idProducto || d.id,
              nombre: d.producto?.nombre || d.nombre || "Producto",
              variantes: variantes,
              talla: d.talla || "", // fallback
              cantidad: d.cantidad || 1,
              precio: d.precio || d.producto?.precioVenta || 0,
              subtotal: d.subtotal || 0,
            };
          })
        : [],
    };
  } catch (err) {
    console.error("🛡️ Venta corrupta saltada:", err);
    return null; // El filtro la eliminará
  }
};

/**
 * Mapea los datos del frontend al formato que el BACKEND espera en req.body
 */
export const mapFrontendToBackend = (v) => ({
  idCliente: parseInt(v.idCliente) || null,
  productos: (v.productos || []).map((p) => ({
    idProducto: p.id,
    cantidad: parseInt(p.cantidad) || 1,
    precio: parseFloat(p.precio) || 0,
    talla: p.talla || "",
  })),
  metodoPago: v.metodoPago || "Efectivo",
  comprobante: v.evidencia || null,
  direccionEnvio: v.direccionEnvio || null,
  tipoEntrega: v.tipoEntrega || "envio",
});

export const getSales = async () => {
  try {
    const response = await adminApi.getSales();

    // 🛡️ EXTRACCIÓN ULTRA-ROBUSTA
    let rawData = [];
    if (Array.isArray(response?.data?.data)) rawData = response.data.data;
    else if (Array.isArray(response?.data)) rawData = response.data;
    else if (Array.isArray(response)) rawData = response;

    // Si sigue vacío, buscar campos anidados
    if (rawData.length === 0 && response?.data?.ventas)
      rawData = response.data.ventas;

    const mapped = rawData
      .map((v) => {
        try {
          const item = mapBackendToFrontend(v);
          // Aseguramos que la fecha original viaje para el Dashboard
          if (item) item.fechaOriginal = v.fecha || v.Fecha || v.createdAt;
          return item;
        } catch (e) {
          return null;
        }
      })
      .filter((v) => v !== null);

    return mapped;
  } catch (error) {
    console.error("🚨 Error crítico cargando ventas:", error);
    return []; // Devolver vacío para que la UI no explote, pero loguear el error
  }
};

export const createSale = async (saleData) => {
  try {
    const backendData = mapFrontendToBackend(saleData);
    console.log(
      "📤 Enviando al backend:",
      JSON.stringify(backendData, null, 2),
    );
    const response = await api.post("/api/ventas", backendData);
    return mapBackendToFrontend(response.data?.data || response.data);
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

export const updateSaleStatus = async (
  id,
  status,
  reason = "",
  evidence = null,
  montoPagado = undefined,
  monto1 = undefined,
  monto2 = undefined,
) => {
  try {
    // Si el estado es Anulada, usamos el endpoint específico de anulación
    if (status === "Anulada") {
      const response = await api.post(`/api/ventas/${id}/anular`);
      return mapBackendToFrontend(response.data?.data || response.data);
    }

    const response = await api.patch(`/api/ventas/${id}/estado`, {
      nuevoEstado: status,
      motivoRechazo: reason,
      comprobante2: evidence,
      montoPagado: montoPagado,
      monto1,
      monto2,
    });
    return mapBackendToFrontend(response.data?.data || response.data);
  } catch (error) {
    console.error("Error updating sale status:", error);
    throw error;
  }
};

export const updateEnvioStatus = async (id, statusenvio) => {
  try {
    const response = await adminApi.updateEnvioStatus(id, statusenvio);
    return mapBackendToFrontend(response.data?.data || response.data);
  } catch (error) {
    console.error("Error updating envio status:", error);
    throw error;
  }
};

export const informarPagoParcial = async (
  id,
  montoRecibido,
  evidence = null,
) => {
  try {
    const response = await api.patch(`/api/ventas/${id}/estado`, {
      nuevoEstado: "Pago Incompleto",
      montoPagado: montoRecibido,
      comprobante2: evidence,
    });
    return mapBackendToFrontend(response.data?.data || response.data);
  } catch (error) {
    console.error("Error informing partial payment:", error);
    throw error;
  }
};

export const getStatuses = async () => {
  try {
    const response = await adminApi.getEstados();
    return response.data?.data || response.data || []; // Array of strings or objects [{ Nombre: 'Pendiente' }]
  } catch (error) {
    console.error("Error fetching statuses:", error);
    throw error;
  }
};

export const getPaymentMethods = async () => {
  try {
    const response = await adminApi.getMetodosPago();
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    throw error;
  }
};

export const getSizes = async () => {
  try {
    const response = await adminApi.getTallas();
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error("Error fetching sizes:", error);
    throw error;
  }
};

export const getCustomers = async () => {
  try {
    const response = await api.get("/api/clientes");
    const data = response.data?.data || response.data || [];

    // Mapear para que el selector siempre tenga id, nombre, dirección, documento y correo
    return data.map((c) => ({
      id: c.id || c.IdCliente,
      nombre:
        c.nombreCompleto ||
        c.NombreCompleto ||
        c.nombre ||
        c.Nombre ||
        "Sin nombre",
      direccion: c.direccion || c.Direccion || "",
      num_documento: c.numeroDocumento || c.NumeroDocumento || "N/A",
      correo: c.email || c.Email || "S/C",
    }));
  } catch (error) {
    console.error("Error fetching customers for sales:", error);
    return [];
  }
};
