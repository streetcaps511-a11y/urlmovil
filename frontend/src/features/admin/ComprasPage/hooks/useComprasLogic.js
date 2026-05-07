/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

// src/modules/purchases/hooks/useComprasLogic.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { NitroCache } from '../../../shared/utils/NitroCache';
import Swal from 'sweetalert2';
import { 
  fetchAllCompras, 
  createNewCompra, 
  fetchAllProveedores, 
  getStatuses, 
  getPaymentMethods, 
  getSizes,
  updateCompraStatus,
  fetchAllProductos
} from '../services/comprasApi';

// // 🧠 MEMORIA GLOBAL (Caché Nitro)
const getInitialCompras = () => {
    const cached = NitroCache.get('compras_v2');
    return Array.isArray(cached?.data) ? cached.data : [];
};
const getInitialProv = () => {
    const cached = NitroCache.get('compras_prov');
    return cached?.data || [];
};
// // 🧠 MEMORIA GLOBAL
let localCache = {
  isInitialized: false
};

export const useComprasLogic = (location) => {
  const [modoVista, setModoVista] = useState("lista");
  const [compras, setCompras] = useState(() => getInitialCompras());
  const [proveedores, setProveedores] = useState(() => getInitialProv());
  const [availableStatuses, setAvailableStatuses] = useState(['Todos', 'Pendiente', 'Completada', 'Anulada']);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(['Efectivo', 'Transferencia']);
  const [availableSizes, setAvailableSizes] = useState([
    { value: 'Ajustable', label: 'Ajustable' },
    { value: '7', label: '7' },
    { value: '7/1/4', label: '7/1/4' },
    { value: '7/1/8', label: '7/1/8' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [productoPage, setProductoPage] = useState(1);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [errors, setErrors] = useState({});
  const [compraViendo, setCompraViendo] = useState(null);
  const [compraEditando, setCompraEditando] = useState(null);
  const [completarModal, setCompletarModal] = useState({ isOpen: false, compra: null });
  const [annulModal, setAnnulModal] = useState({ isOpen: false, compra: null });
  const [productos, setProductos] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingText, setActionLoadingText] = useState('Procesando...');

  const [nuevaCompra, setNuevaCompra] = useState({
    proveedor: '',
    idProveedor: '',
    metodoPago: 'Efectivo',
    fecha: '',
    productos: [{
      id: '',
      nombre: '',
      variantes: [{ talla: '', cantidad: 1, _tempKey: Math.random() }],
      precioCompra: '',
      precioVenta: '',
      precioMayorista6: '',
      precioMayorista80: '',
      _tempKey: Math.random()
    }],
    estado: 'Completada',
    numeroFactura: '',
    fechaRegistro: ''
  });

  const proveedoresActivos = useMemo(() => {
    if (!Array.isArray(proveedores)) return [];
    return proveedores.map(s => ({
      id: s.IdProveedor || s.id,
      nombre: s.Nombre || s.nombre || s.companyName || s.contactName || 'Sin Nombre'
    }));
  }, [proveedores]);

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
        setLoading(false);
        return;
    }

    try {
        const [cData, pData, methods, prData] = await Promise.all([
            fetchAllCompras(),
            fetchAllProveedores(),
            getPaymentMethods(),
            fetchAllProductos()
        ]);

        const sorted = [...(cData || [])].sort((a, b) => (parseInt(b.numCompra) || 0) - (parseInt(a.numCompra) || 0));
        
        setCompras(sorted);
        setProveedores(pData || []);
        NitroCache.set('compras_v2', sorted);
        NitroCache.set('compras_prov', pData || []);
        
        if (Array.isArray(methods)) {
            setAvailablePaymentMethods(methods.map(m => typeof m === 'string' ? m : (m.Nombre || m.nombre)));
        }

        if (Array.isArray(prData)) {
          const mapped = prData.map(p => ({
            ...p,
            nombre: p.nombre || p.Nombre,
            id: p.id || p.IdProducto,
            precioCompra: p.precioCompra || p.PrecioCompra,
            precioVenta: p.precioVenta || p.PrecioVenta
          }));
          setProductos(mapped);
        }
        localCache.isInitialized = true;
    } catch (e) {
        console.error("Error fetchData Compras:", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const mostrarLista = useCallback(() => {
    setModoVista("lista");
    setCompraEditando(null);
    setCompraViendo(null);
    setProductoPage(1);
  }, []);

  const mostrarFormulario = useCallback(async (compra = null) => {
    setModoVista("formulario"); // 🚀 RESPUESTA INSTANTÁNEA
    setProductoPage(1);
    setErrors({});

    // Cargar productos en segundo plano si es necesario
    if (productos.length === 0) {
      setIsLoadingProducts(true);
      fetchAllProductos().then(prData => {
        const mapped = (Array.isArray(prData) ? prData : []).map(p => ({
          ...p,
          nombre: p.nombre || p.Nombre,
          id: p.id || p.IdProducto,
          precioCompra: p.precioCompra || p.PrecioCompra,
          precioVenta: p.precioVenta || p.PrecioVenta
        }));
        setProductos(mapped);
        setIsLoadingProducts(false);
      }).catch(() => setIsLoadingProducts(false));
    }

    if (compra) {
      if (compra.estado === 'Anulada') {
        showAlert('Las compras anuladas no se pueden editar', 'error');
        setModoVista("lista");
        return;
      }
      setCompraEditando(compra);
      setNuevaCompra({
        proveedor: compra.proveedor,
        idProveedor: compra.idProveedor || '',
        metodoPago: compra.metodo,
        fecha: compra.fecha,
        // Agrupar productos por nombre para la UI de variantes
        productos: (compra.productos || []).reduce((acc, p) => {
          const existing = acc.find(item => item.nombre === p.nombre);
          if (existing) {
            existing.variantes.push({ talla: p.talla, cantidad: p.cantidad, _tempKey: Math.random() });
          } else {
            acc.push({
              ...p,
              variantes: [{ talla: p.talla, cantidad: p.cantidad, _tempKey: Math.random() }],
              _tempKey: Math.random()
            });
          }
          return acc;
        }, []),
        estado: compra.estado,
        numeroFactura: compra.numeroRecibo || '',
        fechaRegistro: compra.fechaRegistro || ''
      });
    } else {
      // El usuario solicitó que siempre diga 10001 por defecto
      const nextFactura = '10001';


      setCompraEditando(null);
      setNuevaCompra({
        proveedor: '',
        idProveedor: '',
        metodoPago: 'Efectivo',
        fecha: '',
        productos: [{
          id: '',
          nombre: '',
          variantes: [{ talla: '', cantidad: 1, _tempKey: Math.random() }],
          precioCompra: '',
          precioVenta: '',
          precioMayorista6: '',
          precioMayorista80: '',
          _tempKey: Math.random()
        }],
        estado: 'Completada',
        numeroFactura: '',
        nextFacturaPlaceholder: nextFactura,
        fechaRegistro: ''
      });
    }
  }, [showAlert, productos.length, compras]);


  const mostrarDetalle = useCallback((compra) => {
    if (!compra) return;
    
    // ⚡ AGRUPAR PRODUCTOS: Para que el detalle se vea igual al formulario (mismo producto, múltiples tallas)
    const productosAgrupados = (compra.productos || []).reduce((acc, p) => {
      const existing = acc.find(item => item.nombre === p.nombre);
      const variantesDelProducto = p.variantes || [{ talla: p.talla, cantidad: p.cantidad }];

      if (existing) {
        // Evitar duplicados si por alguna razón ya existen
        variantesDelProducto.forEach(v => {
          const vExists = existing.variantes.find(ev => ev.talla === v.talla);
          if (vExists) vExists.cantidad += (v.cantidad || 0);
          else existing.variantes.push({ ...v, _tempKey: Math.random() });
        });
      } else {
        acc.push({
          ...p,
          variantes: variantesDelProducto.map(v => ({ ...v, _tempKey: Math.random() })),
          _tempKey: Math.random()
        });
      }
      return acc;
    }, []);

    setCompraViendo({ ...compra, productos: productosAgrupados });
    setModoVista("detalle");
    setProductoPage(1);
  }, []);

  // ✅ useEffect con dependencia estable
  useEffect(() => {
    if (location?.state?.openModal) {
      mostrarFormulario();
    }
  }, [location, mostrarFormulario]);

  const agregarProducto = useCallback(() => {
    setProductoPage(1);
    setNuevaCompra(p => ({
      ...p,
      // 🚀 Añadir al principio (de primero)
      productos: [{
        id: '',
        nombre: '',
        variantes: [{ talla: '', cantidad: 1, _tempKey: Math.random() }],
        precioCompra: '',
        precioVenta: '',
        precioMayorista6: '',
        precioMayorista80: '',
        _tempKey: Math.random()
      }, ...p.productos]
    }));
  }, []);

  const actualizarProducto = useCallback((index, campo, valor) => {
    // ⚡ Limpiar error en tiempo real
    const errorKey = `prod_${index}`;
    if (errors[errorKey] || errors[`qty_${index}`] || errors[`price_${index}`] || errors[`sell_${index}`] || errors[`talla_${index}`]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[errorKey];
        delete n[`qty_${index}`];
        delete n[`price_${index}`];
        delete n[`sell_${index}`];
        delete n[`talla_${index}`];
        return n;
      });
    }

    setNuevaCompra(p => {
      const n = [...p.productos];
      if (campo === 'variantes') {
        n[index] = { ...n[index], variantes: valor };
      } else {
        n[index] = { ...n[index], [campo]: valor };
      }
      return { ...p, productos: n };
    });
  }, [errors]);

  const eliminarProducto = useCallback((index) => {
    setNuevaCompra(p => {
      if (index === 0) {
        // 🗑️ La papelera del primero siempre limpia la fila, no la elimina
        const newProducts = [...p.productos];
        newProducts[0] = {
            id: '',
            nombre: '',
            variantes: [{ talla: '', cantidad: 1, _tempKey: Math.random() }],
            precioCompra: '',
            precioVenta: '',
            precioMayorista6: '',
            precioMayorista80: '',
            _tempKey: Math.random()
        };
        return { ...p, productos: newProducts };
      } else {
        return {
          ...p,
          productos: p.productos.filter((_, i) => i !== index)
        };
      }
    });
  }, []);

  const calcularTotal = useCallback(() =>
    nuevaCompra.productos.reduce((t, p) => {
      const totalCant = (p.variantes || []).reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
      return t + (totalCant * (parseFloat(p.precioCompra) || 0));
    }, 0),
  [nuevaCompra.productos]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const e_fields = {};
    
    if (!nuevaCompra.proveedor) e_fields.proveedor = 'El proveedor es obligatorio';
    if (!nuevaCompra.numeroFactura) e_fields.numeroFactura = 'El N° Factura es obligatorio';
    nuevaCompra.productos.forEach((p, i) => {
      if (!p.nombre) e_fields[`prod_${i}`] = true;
      (p.variantes || []).forEach((v, vi) => {
        if (!v.talla) e_fields[`talla_${i}_${vi}`] = true;
        if (!v.cantidad || v.cantidad <= 0) e_fields[`qty_${i}_${vi}`] = true;
      });
      if (!p.precioCompra || p.precioCompra <= 0) e_fields[`price_${i}`] = true;
      if (!p.precioVenta || p.precioVenta <= 0) e_fields[`sell_${i}`] = true;
    });

    if (Object.keys(e_fields).length > 0) {
      setErrors(e_fields);
      showAlert('Por favor, completa todos los campos obligatorios marcados en rojo', 'error');
      return;
    }

    const total = calcularTotal();
    const pvr = proveedoresActivos.find(p => p.nombre === nuevaCompra.proveedor);

    // ⚡ APLANAR PRODUCTOS: Un producto con 3 variantes se convierte en 3 registros individuales para el backend
    const flatProductos = nuevaCompra.productos.flatMap(p => 
      (p.variantes || []).map(v => ({
        id: p.id,
        nombre: p.nombre,
        talla: v.talla,
        cantidad: v.cantidad,
        precioCompra: p.precioCompra,
        precioVenta: p.precioVenta,
        precioMayorista6: p.precioMayorista6,
        precioMayorista80: p.precioMayorista80
      }))
    );

    const payload = {
      ...nuevaCompra,
      numeroRecibo: nuevaCompra.numeroFactura,
      idProveedor: pvr?.id || '',
      productos: flatProductos,
      total
    };

    try {
      setActionLoadingText(compraEditando ? 'Actualizando...' : 'Guardando...');
      setActionLoading(true);
      if (compraEditando) {
        showAlert('Funcionalidad de edición conectando...');
      } else {
        await createNewCompra(payload);
        showAlert('Compra registrada correctamente');
      }
      fetchData();
      setTimeout(() => mostrarLista(), 200);
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      showAlert(serverMsg || 'Error al procesar la compra', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [nuevaCompra, compraEditando, proveedoresActivos, calcularTotal, fetchData, mostrarLista, showAlert]);



  const filtered = useMemo(() => {
    return compras.filter(c => {
      const search = (c.proveedor + c.id).toLowerCase().includes(searchTerm.toLowerCase());
      const status = filterStatus === 'Todos' || c.estado === filterStatus.slice(0, -1) || c.estado === filterStatus;
      
      let matchDate = true;
      if (filterDate) {
        const [, year, month, day] = filterDate.match(/(\d{4})-(\d{2})-(\d{2})/) || [];
        if (year && month && day) {
          const formattedFilter = new Date(`${year}-${month}-${day}T12:00:00`).toLocaleDateString('es-CO');
          matchDate = (c.fecha === formattedFilter);
        }
      }
      
      return search && status && matchDate;
    });
  }, [compras, searchTerm, filterStatus, filterDate]);

  const handleCompletarCompra = useCallback((compra) => {
    if (compra.estado !== 'Pendiente') return;
    setCompletarModal({ isOpen: true, compra });
  }, []);

  const confirmCompletarCompra = useCallback(async () => {
    if (!completarModal.compra) return;
    
    setActionLoadingText('Completando...');
    setActionLoading(true);
    try {
      await updateCompraStatus(completarModal.compra.numCompra, 'Completada');
      showAlert('Registro completado correctamente');
      setCompletarModal({ isOpen: false, compra: null });
      fetchData();
    } catch (error) {
      showAlert('Error al actualizar el estado', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [completarModal.compra, fetchData, showAlert]);

  const handleAnularCompra = useCallback(async () => {
    if (!annulModal.compra) return;

    setActionLoadingText('Anulando...');
    setActionLoading(true);
    try {
      await updateCompraStatus(annulModal.compra.numCompra, 'Anulada');
      showAlert('Compra anulada correctamente');
      setAnnulModal({ isOpen: false, compra: null });
      fetchData();
    } catch (error) {
      showAlert('Error al anular la compra', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [annulModal.compra, fetchData, showAlert]);

  return {
    modoVista, setModoVista,
    compras,
    availableStatuses,
    availablePaymentMethods,
    availableSizes,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    filterDate, setFilterDate,
    currentPage, setCurrentPage,
    itemsPerPage,
    productoPage, setProductoPage,
    alert, setAlert,
    errors, setErrors,
    compraViendo, setCompraViendo,
    compraEditando, setCompraEditando,
    completarModal, setCompletarModal,
    nuevaCompra, setNuevaCompra,
    proveedoresActivos,
    showAlert,
    mostrarLista,
    mostrarFormulario,
    mostrarDetalle,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    calcularTotal,
    handleSubmit,
    handleCompletarCompra,
    confirmCompletarCompra,
    handleAnularCompra,
    annulModal, setAnnulModal,
    filtered,
    actionLoading,
    actionLoadingText,
    availableProducts: productos,
    isLoadingProducts
  };
};