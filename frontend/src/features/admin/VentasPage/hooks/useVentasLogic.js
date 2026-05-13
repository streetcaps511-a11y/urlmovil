/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { NitroCache } from '../../../shared/utils/NitroCache';
import * as ventasService from "../services/ventasApi";
import * as productosService from "../../Productos/services/productosApi";

// 🧠 MEMORIA GLOBAL (Caché Nitro)
let ventasCache = {
  ventas: [],
  availableStatuses: ['Pendiente', 'Completada', 'Rechazada', 'Anulada'],
  isInitialized: false
};

// 🧠 CONFIGURACIÓN INICIAL (Caché Nitro Persistente)
const getInitialVentas = () => {
  const cached = NitroCache.get('ventas');
  return Array.isArray(cached?.data) ? cached.data : [];
};
const getInitialSupportData = (key, defaultVal = []) => {
  const cached = NitroCache.get(key);
  return Array.isArray(cached?.data) ? cached.data : defaultVal;
};

export const useVentasLogic = (initialAvailableProducts = [], initialAvailableCustomers = [], initialAvailableSizes = []) => {
  const initialVentas = getInitialVentas();
  const [ventas, setVentas] = useState(initialVentas);
  const [availableStatuses, setAvailableStatuses] = useState(['Pendiente', 'Completada', 'Rechazada', 'Anulada']);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [availableSizes, setAvailableSizes] = useState(['Ajustable', '7', '7/1/4', '7/1/8']);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  const [modoVista, setModoVista] = useState("lista"); // "lista", "formulario", "detalle"
  const [ventaViendo, setVentaViendo] = useState(null);
  const [approveModal, setApproveModal] = useState({ isOpen: false, venta: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, venta: null });
  const [partialPaymentModal, setPartialPaymentModal] = useState({ isOpen: false, venta: null, montoRecibido: '', montoNuevo: '', evidencia2: null });
  const [annulModal, setAnnulModal] = useState({ isOpen: false, venta: null });
  const [sendConfirmModal, setSendConfirmModal] = useState({ isOpen: false, venta: null });
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [errors, setErrors] = useState({});
  const [nuevaVenta, setNuevaVenta] = useState({
    cliente: '',
    metodoPago: '',
    fecha: new Date().toLocaleDateString('es-CO'),
    productos: [{ id: '', nombre: '', variantes: [{ talla: '', cantidad: 1, _tempKey: Date.now() }], precio: '', _tempKey: Date.now() + Math.random() }],
    estado: ventasCache.availableStatuses[0] || '',
    motivoRechazo: '',
    evidencia: null,
    tipoEntrega: '',
    direccionEnvio: ''
  });

  // ====== FETCH INICIAL (Nitro Sync) ======
  const fetchData = useCallback(async (loadAll = false) => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    // Si no hay datos previos, mostramos cargando
    const current = getInitialVentas();
    try {
      const salesData = await ventasService.getSales();
      setVentas(salesData);
      NitroCache.set('ventas', salesData);

      if (loadAll) {
        const [statuses, methods, sizes, customers, products] = await Promise.all([
          ventasService.getStatuses(),
          ventasService.getPaymentMethods(),
          ventasService.getSizes(),
          ventasService.getCustomers(),
          productosService.getProductos()
        ]);

        const mappedStatuses = statuses.map(s => typeof s === 'string' ? s : (s.nombre || s.Nombre));
        const mappedMethods = methods.map(m => typeof m === 'string' ? m : (m.nombre || m.Nombre));
        const mappedSizes = sizes.length > 0 ? sizes.map(s => typeof s === 'string' ? s : (s.nombre || s.Nombre || s.talla || s.Talla)) : ['Ajustable', '7', '7/1/4', '7/1/8'];
        const activeProducts = products.filter(p => p.isActive);

        setAvailableStatuses(mappedStatuses);
        setAvailablePaymentMethods(mappedMethods);
        setAvailableSizes(mappedSizes);
        setAvailableCustomers(customers);
        setAvailableProducts(activeProducts);
      }

    } catch (error) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await ventasService.getSales();
      setVentas(data);
      NitroCache.set('ventas', data);
    } catch (error) {
      console.error("❌ Error en auto-sincronización:", error);
    }
  }, [modoVista]);

  const notifySync = () => {
    const channel = new BroadcastChannel('app_sync');
    channel.postMessage('ventas_updated');
    channel.close();
  };

  useEffect(() => {
    fetchData(); // Carga inicial de ventas
    
    // 📡 Listener de sincronización entre pestañas
    const channel = new BroadcastChannel('app_sync');
    channel.onmessage = (event) => {
        if (event.data === 'ventas_updated') {
            refreshData(); // Refrescar ventas en segundo plano
        }
    };

    // Auto-refresco cada 45 segundos (más calmado) solo de ventas
    const interval = setInterval(() => {
        if (modoVista === 'lista') refreshData();
    }, 45000);
    
    return () => {
        clearInterval(interval);
        channel.close();
    };
  }, [fetchData, refreshData, modoVista]);

  // ====== ALERTA ======
  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  // ====== NAVEGACIÓN VISTAS ======
  const mostrarLista = () => {
    setModoVista("lista");
    setVentaViendo(null);
    setIsRejecting(false);
    setRejectionReason('');
  };

  const mostrarFormulario = () => {
    // Cargar datos maestros solo cuando se entra al formulario
    fetchData(true); 

    setNuevaVenta({
      cliente: '',
      metodoPago: '',
      fecha: new Date().toLocaleDateString('es-CO'),
      productos: [{ id: '', nombre: '', variantes: [{ talla: '', cantidad: 1, _tempKey: Date.now() }], precio: '', _tempKey: Date.now() + Math.random() }],
      estado: availableStatuses[0] || '',
      motivoRechazo: '',
      evidencia: null,
      tipoEntrega: '',
      direccionEnvio: ''
    });
    setErrors({});
    setModoVista("formulario");
  };

  const mostrarDetalle = (venta) => {
    setVentaViendo(venta);
    setIsRejecting(false);
    setRejectionReason('');
    setModoVista("detalle");
  };

  // ====== PRODUCTOS EN FORMULARIO ======
  const agregarProducto = () => setNuevaVenta(p => ({
    ...p,
    // 🚀 Añadir al principio (de primero)
    productos: [{ id: '', nombre: '', variantes: [{ talla: '', cantidad: 1, _tempKey: Date.now() }], precio: '', _tempKey: Math.random() }, ...p.productos]
  }));
  
  const actualizarProducto = (index, campo, valor) => {
    // ⚡ Limpiar error en tiempo real
    const errorKey = index === -1 ? campo : `producto_${campo}_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr[errorKey];
        return newErr;
      });
    }

    setNuevaVenta(p => {
      // 🔥 Si el índice es -1, actualizamos un campo global (cliente, metodoPago, fecha)
      if (index === -1) {
        return { ...p, [campo]: valor };
      }
      const n = [...p.productos];
      n[index] = { ...n[index], [campo]: valor };
      return { ...p, productos: n };
    });
  };
  
  const eliminarProducto = (index) => {
    if (nuevaVenta.productos.length > 1) {
      setNuevaVenta(p => ({ ...p, productos: p.productos.filter((_, i) => i !== index) }));
    }
  };
  
  const calcularTotal = () => nuevaVenta.productos.reduce((t, p) => {
    const qtyTotal = (p.variantes || []).reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
    return t + (qtyTotal * (parseFloat(p.precio) || 0));
  }, 0);
  
  const calcularTotalViendo = () => {
    if (!ventaViendo) return 0;
    return (ventaViendo.productos || []).reduce((t, p) => t + (p.cantidad * (parseFloat(p.precio) || 0)), 0);
  };

  // ====== ACCIONES ======
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNuevaVenta(prev => ({ ...prev, evidencia: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleImage2Upload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPartialPaymentModal(prev => ({ ...prev, evidencia2: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const requiresReceipt = (method) => {
    if (!method) return false;
    const cashMethod = availablePaymentMethods.find(m => m.toLowerCase().includes('efectivo')) || availablePaymentMethods[0];
    return method !== cashMethod;
  };

  const validate = () => {
    const e = {};
    const reqInfo = requiresReceipt(nuevaVenta.metodoPago);
    if (!nuevaVenta.idCliente) e.idCliente = true;
    if (!nuevaVenta.metodoPago) e.metodoPago = true;
    if (!nuevaVenta.tipoEntrega) e.tipoEntrega = true;
    if (!nuevaVenta.fecha) e.fecha = true;
    if (nuevaVenta.tipoEntrega === 'envio' && !nuevaVenta.direccionEnvio) e.direccionEnvio = true;
    if (reqInfo && !nuevaVenta.evidencia) e.evidencia = true;
    
    let hasStockError = false;

    nuevaVenta.productos.forEach((p, i) => {
      if (!p.id) e[`producto_id_${i}`] = true;
      if (!p.precio || p.precio <= 0) e[`producto_precio_${i}`] = true;
      
      // Validar variantes
      (p.variantes || []).forEach((v, vi) => {
        if (!v.talla) e[`producto_talla_${i}_${vi}`] = true;
        if (!v.cantidad || v.cantidad <= 0) e[`producto_cantidad_${i}_${vi}`] = { msg: 'Obligatorio' };

        // 📦 VALIDACIÓN DE STOCK POR VARIANTE
        if (p.id && v.talla) {
          const prodData = availableProducts.find(ap => ap.id === parseInt(p.id));
          if (prodData && Array.isArray(prodData.tallasStock)) {
            const sizeInfo = prodData.tallasStock.find(ts => ts.talla === v.talla);
            const stockDisponible = sizeInfo ? parseInt(sizeInfo.cantidad) : 0;
            
            if (parseInt(v.cantidad) > stockDisponible) {
              e[`producto_cantidad_${i}_${vi}`] = { 
                msg: 'Excede stock', 
                disponible: stockDisponible 
              };
              hasStockError = true;
            }
          }
        }
      });
    });
    
    setErrors(e);
    
    if (hasStockError) {
      showAlert("Uno o más productos exceden el stock disponible", "error");
    } else if (reqInfo && e.evidencia) {
      showAlert(`Debe adjuntar el comprobante de ${nuevaVenta.metodoPago}`, "error");
    } else if (Object.keys(e).length > 0) {
      showAlert("Por favor complete todos los campos obligatorios", "error");
    }
    
    return Object.keys(e).length === 0;
  };

  const handleCreateVenta = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // ⚡ APLANAR PRODUCTOS: Un producto con 3 variantes se convierte en 3 productos individuales para el backend
      const productosAplanados = nuevaVenta.productos.flatMap(p => 
        (p.variantes || []).map(v => ({
          id: p.id,
          nombre: p.nombre,
          talla: v.talla,
          cantidad: v.cantidad,
          precio: p.precio
        }))
      );

      const saleToCreate = {
        ...nuevaVenta,
        productos: productosAplanados,
        total: calcularTotal()
      };
      const created = await ventasService.createSale(saleToCreate);
      const newVentas = [created, ...ventas];
      setVentas(newVentas);
      NitroCache.set('ventas', newVentas);
      showAlert('Venta registrada exitosamente');
      
      notifySync();
      // Esperar un momento para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        mostrarLista();
      }, 1200);
    } catch (error) {
      showAlert("Error registrando venta: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateVentaStatus = async (status, reason = '', evidence = null, forcedId = null) => {
    setLoading(true);
    try {
      const targetVentaId = forcedId || ventaViendo?.id || rejectModal.venta?.id || approveModal.venta?.id || partialPaymentModal.venta?.id;
      if (!targetVentaId) {
        setLoading(false);
        return;
      }
      const updated = await ventasService.updateSaleStatus(targetVentaId, status, reason, evidence);
      
      const newVentas = ventas.map(v => v.id === updated.id ? updated : v);
      setVentas(newVentas);
      NitroCache.set('ventas', newVentas);
      if (ventaViendo?.id === updated.id) setVentaViendo(updated);
      
      showAlert(`Venta actualizada correctamente`);
      
      setApproveModal({ isOpen: false, venta: null });
      setRejectModal({ isOpen: false, venta: null });
      setPartialPaymentModal({ isOpen: false, venta: null, montoRecibido: '', montoNuevo: '', evidencia2: null });
      notifySync();
      setRejectionReason('');
      setIsRejecting(false);
    } catch (error) {
       console.error('❌ Error en updateVentaStatus:', error);
       showAlert("Error actualizando estado", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialPayment = async (monto1, monto2, evidence = null) => {
    const totalVenta = partialPaymentModal.venta?.total || 0;
    const m1 = parseFloat(monto1) || 0;
    const m2 = parseFloat(monto2) || 0;
    const sumaPagos = m1 + m2;

    if (m1 <= 0 && m2 <= 0) {
      showAlert("Ingrese un monto válido", "error");
      return;
    }

    setLoading(true);
    try {
      const targetVentaId = partialPaymentModal.venta?.id;
      
      // Si la suma llega al total, lo pasamos a COMPLETADA de una vez
      const nuevoEstado = (sumaPagos >= totalVenta) ? 'Completada' : 'Pago Incompleto';
      
      const updated = await ventasService.updateSaleStatus(
        targetVentaId, 
        nuevoEstado, 
        '', 
        evidence || partialPaymentModal.evidencia2,
        sumaPagos,
        m1,
        m2
      );
      
      const newVentas = ventas.map(v => v.id === updated.id ? updated : v);
      setVentas(newVentas);
      NitroCache.set('ventas', newVentas);
      if (ventaViendo?.id === updated.id) setVentaViendo(updated);

      notifySync();
      showAlert(nuevoEstado === 'Completada' ? "Venta completada ✅" : "Pago incompleto registrado ⚠️");
      setPartialPaymentModal({ isOpen: false, venta: null, montoRecibido: '', montoNuevo: '', evidencia2: null });
    } catch (error) {
       showAlert("Error procesando los pagos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarVenta = async (venta) => {
    setLoading(true);
    try {
      const updated = await ventasService.updateEnvioStatus(venta.id, 'Enviado');
      const newVentas = ventas.map(v => v.id === updated.id ? updated : v);
      setVentas(newVentas);
      NitroCache.set('ventas', newVentas);
      if (ventaViendo?.id === updated.id) setVentaViendo(updated);
      showAlert(`Estado de envío actualizado a Enviado`);
      notifySync();
    } catch (error) {
      console.error('❌ Error en handleEnviarVenta:', error);
      showAlert("Error actualizando estado de envío", "error");
    } finally {
      setLoading(false);
    }
  };

  // ====== FILTRADO ======
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return ventas.filter(v => {
      const clienteName = typeof v.cliente === 'object' ? v.cliente?.nombre : (v.cliente || "");
      const search = (clienteName + v.id + (v.noVenta || "")).toLowerCase().includes(term);
      const status = filterStatus === 'Todos' || v.estado === filterStatus;
      return search && status;
    });
  }, [ventas, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVentas = filtered.slice(startIndex, startIndex + itemsPerPage);

  return {
    ventas,
    availableStatuses,
    availablePaymentMethods,
    availableSizes,
    availableCustomers,
    availableProducts,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    currentPage, setCurrentPage,
    loading,
    alert, setAlert,
    modoVista, setModoVista,
    ventaViendo,
    approveModal, setApproveModal,
    rejectModal, setRejectModal,
    partialPaymentModal, setPartialPaymentModal,
    annulModal, setAnnulModal,
    sendConfirmModal, setSendConfirmModal,
    isRejecting, setIsRejecting,
    rejectionReason, setRejectionReason,
    errors,
    nuevaVenta,
    filtered,
    paginatedVentas,
    totalPages,
    mostrarLista,
    mostrarFormulario,
    mostrarDetalle,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    calcularTotal,
    calcularTotalViendo,
    handleImageUpload,
    handleImage2Upload,
    handleCreateVenta,
    updateVentaStatus,
    handlePartialPayment,
    handleEnviarVenta,
    requiresReceipt
  };
};
