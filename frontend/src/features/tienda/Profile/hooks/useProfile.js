/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../../shared/contexts";
import * as profileApi from "../services/profileApi";
import { NitroCache } from "../../../shared/utils/NitroCache";

export const useProfile = () => {
  const { user: authUser, logout: onLogout, isAdmin } = useAuth();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });
  const [formData, setFormData] = useState({
    documentType: "", documentNumber: "",
    name: "", email: "", phone: "",
    department: "", city: "", address: "",
  });
  const [errors, setErrors] = useState({}); // 🟢 Estado para errores de perfil
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredModalData, setExpiredModalData] = useState({ periodDays: 5, expiredDate: '', orderDate: '' });
  const [orderQuery, setOrderQuery] = useState("");
  const [returnQuery, setReturnQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl || "");
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('account'); 
  const [orderView, setOrderView] = useState('list'); 
  const [returnView, setReturnView] = useState('list'); 
  const [isBulkReturn, setIsBulkReturn] = useState(false);
  
  const [orderStatus, setOrderStatus] = useState('Todos');
  const [returnStatus, setReturnStatus] = useState('Todos');
  
  const [returnFormData, setReturnFormData] = useState({
    replacementProductId: "",
    mismoModelo: false,
    evidence: null,
    reason: "",
    cantidad: 1
  });
  const [returnErrors, setReturnErrors] = useState({});
  const [showReturnForm, setShowReturnForm] = useState(false);
  
  const [ordersPage, setOrdersPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, title: "", message: "", onConfirm: null, confirmText: "CONFIRMAR", isDanger: false 
  });
  const [initialProducts, setInitialProducts] = useState([]);

  // Load products (Only when needed for returns)
  useEffect(() => {
    if (activeTab === 'returns' && initialProducts.length === 0) {
      const fetchProds = async () => {
        const prods = await profileApi.getProducts();
        setInitialProducts(prods);
      };
      fetchProds();
    }
  }, [activeTab, initialProducts.length]);

  // Sync auth user
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setFormData({
        documentType: authUser.DocumentoTipo || authUser.documentType || "",
        documentNumber: authUser.DocumentoNumero || authUser.documentNumber || "",
        name: authUser.Nombre || authUser.name || "",
        email: authUser.Correo || authUser.email || "",
        phone: authUser.Telefono || authUser.phone || "",
        department: authUser.Departamento || authUser.department || "",
        city: authUser.Ciudad || authUser.city || "",
        address: authUser.Direccion || authUser.address || "",
      });
      setAvatarUrl(authUser.avatarUrl || "");
    }
  }, [authUser]);

  // Body scroll lock
  useEffect(() => {
    if (showPolicyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showPolicyModal]);

  const showTopToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast({ open: false, text: "" }), 2500); // 2.5 SEGUNDOS
  };

  const handleEditClick = () => setIsEditing(true);

  const handleSaveClick = async () => {
    // 🟢 VALIDACIÓN DE EMAIL (Solo al guardar)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setErrors({ email: "Ingresa un correo de Gmail válido" });
      return;
    }

    setErrors({}); // Limpiar errores si todo está bien

    const updatedUser = {
      ...user,
      DocumentoTipo: formData.documentType, documentType: formData.documentType,
      DocumentoNumero: formData.documentNumber, documentNumber: formData.documentNumber,
      Nombre: formData.name, name: formData.name,
      Correo: formData.email, email: formData.email,
      Telefono: formData.phone, phone: formData.phone,
      Departamento: formData.department, department: formData.department,
      Ciudad: formData.city, city: formData.city,
      Direccion: formData.address, address: formData.address,
      avatarUrl: avatarUrl || "",
    };
    
    await profileApi.updateProfile(updatedUser);
    setUser(updatedUser);
    setIsEditing(false);
    showTopToast("Cambios guardados correctamente.");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    
    // Limpiar error del campo mientras el usuario escribe
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };
  
  const getAvatarInitial = () => {
    const name = (formData.name || user?.Nombre || user?.name || "").trim();
    const email = (formData.email || user?.Correo || user?.email || "").trim();
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };
  
  const openFilePicker = () => fileInputRef.current?.click();
  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const newAvatar = reader.result;
      setAvatarUrl(newAvatar);
      setShowAvatarMenu(false);
      
      try {
        // Guardado automático solo para la foto
        await profileApi.updateProfile({
          ...formData,
          avatarUrl: newAvatar
        });
        showTopToast("Foto de perfil actualizada correctamente.");
      } catch (error) {
        showTopToast("Error al guardar la foto.");
      }
    };
    reader.readAsDataURL(file);
  };
  
  const removeAvatar = () => {
    setConfirmModal({
      open: true,
      title: "Eliminar foto de perfil",
      message: "¿Estás seguro de que deseas eliminar tu foto de perfil actual? Esta acción no se puede deshacer.",
      confirmText: "ACEPTAR",
      isDanger: true,
      onConfirm: async () => {
        setAvatarUrl("");
        setShowAvatarMenu(false);
        setConfirmModal(prev => ({ ...prev, open: false }));
        
        try {
          await profileApi.updateProfile({
            ...formData,
            avatarUrl: ""
          });
          showTopToast("Foto de perfil eliminada.");
        } catch (error) {
          showTopToast("Error al eliminar la foto.");
        }
      }
    });
  };

  const openImage = (src) => { 
    if (!src) return; 
    setImageModalSrc(src); 
    setShowImageModal(true); 
  };

  const checkReturnPeriod = (order) => {
    if (!order?.date) return true; // Expired by default if no date
    const [day, month, year] = order.date.split('/').map(Number);
    const orderDate = new Date(year, month - 1, day);
    const today = new Date();
    
    // Calcular fecha de expiración (5 días después)
    const expirationDate = new Date(orderDate);
    expirationDate.setDate(expirationDate.getDate() + 5);
    
    const diffTime = today - orderDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays > 5) {
      setExpiredModalData({
        periodDays: 5,
        orderDate: order.date,
        expiredDate: expirationDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      });
      setShowExpiredModal(true);
      return false;
    }
    return true;
  };

  const handleReturnClick = (product, order) => {
    if (!checkReturnPeriod(order)) return;
    
    // 🛡️ VERIFICAR SI YA EXISTE UNA DEVOLUCIÓN PARA ESTE PRODUCTO EN ESTA ORDEN
    const hasReturn = allReturns.some(r => 
      r.orderId === order.id && 
      String(r.productId) === String(product.id) && 
      !String(r.status).toLowerCase().includes('rechazad')
    );
    if (hasReturn) {
      showTopToast("Este producto ya tiene una solicitud de cambio en curso.");
      return;
    }

    setIsBulkReturn(false);
    setSelectedProduct({ ...product, orderId: order.id, maxQty: product.qty || 1 });
    setReturnFormData({ replacementProductId: "", mismoModelo: false, evidence: null, reason: "", cantidad: 1 });
    setReturnErrors({});
    setShowPolicyModal(true);
    setActiveTab('returns');
  };

  const handleBulkReturnClick = (order) => {
    if (!order || !order.items?.length) return;
    if (!checkReturnPeriod(order)) return;

    // 🛡️ VERIFICAR SI YA HAY DEVOLUCIONES PARA ESTA ORDEN
    const hasReturn = allReturns.some(r => 
      r.orderId === order.id && 
      !String(r.status).toLowerCase().includes('rechazad')
    );
    if (hasReturn) {
      showTopToast("Este pedido ya cuenta con solicitudes de cambio activas.");
      return;
    }

    setIsBulkReturn(true);
    // Para devolución masiva, seleccionamos el primer producto para el pre-llenado de la UI
    // pero guardaremos la orden completa
    setSelectedProduct({ ...order.items[0], orderId: order.id });
    setReturnFormData({ replacementProductId: "", mismoModelo: false, evidence: null, reason: "" });
    setReturnErrors({});
    setShowPolicyModal(true);
    setActiveTab('returns');
  };

  const handleContinueToReturn = () => {
    setShowPolicyModal(false);
    setShowReturnForm(true);
    setReturnView('form');
  };

  const handleReturnImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReturnFormData(prev => ({ ...prev, evidence: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const getPriceNum = (price) => {
    if (typeof price === 'number') return Math.floor(price);
    if (!price) return 0;
    
    // Remove currency symbol and dots (thousands separator in es-CO)
    // Handle decimals if separated by comma (es-CO standard)
    const clean = price.toString().split(',')[0].replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!returnFormData.reason.trim()) errs.reason = true;
    if (!returnFormData.evidence) errs.evidence = true;
    
    // En devolución masiva forzamos "mismo modelo" para todos para simplificar el flujo
    if (!isBulkReturn) {
      if (!returnFormData.mismoModelo && returnFormData.replacementProductId) {
        const replacement = initialProducts.find(p => String(p.id) === String(returnFormData.replacementProductId));
        const originalPrice = getPriceNum(selectedProduct?.price);
        if (replacement && Math.floor(Number(replacement.precio)) !== originalPrice) errs.priceMismatch = true;
        if (replacement && !replacement.tallas?.includes(selectedProduct?.size)) errs.sizeMismatch = true;
      }
    }

    if (Object.keys(errs).length > 0) {
      setReturnErrors(errs);
      if (errs.priceMismatch) showTopToast("El precio del nuevo producto debe ser igual al original.");
      else if (errs.sizeMismatch) showTopToast("El producto de reemplazo debe estar disponible en la misma talla.");
      else if (errs.evidence) showTopToast("La foto de evidencia es obligatoria.");
      else showTopToast("Completa los campos obligatorios.");
      return;
    }
    setConfirmModal({
      open: true,
      title: "Confirmar Solicitud de Cambio",
      message: "¿Deseas enviar tu solicitud de cambio ahora? Una vez enviada, el equipo de administración revisará la información y no podrás editarla.",
      confirmText: "ACEPTAR",
      onConfirm: async () => {
        try {
          const commonData = {
            idCliente: authUser.idCliente || authUser.IdCliente || authUser.id,
            idVenta: (() => {
              const raw = Number(String(selectedProduct.orderId).replace('PED-', ''));
              return raw > 10000 ? raw - 10000 : raw;
            })(),
            motivo: returnFormData.reason,
            evidencia: returnFormData.evidence,
            cantidad: isBulkReturn ? undefined : Number(returnFormData.cantidad || 1)
          };

          if (isBulkReturn) {
            // Devolución Masiva: Crear un registro por cada producto de la orden
            const timestamp = Date.now();
            const lotId = `LOT-PED-${selectedOrder.id}-${timestamp}`;
            const productsToReturn = selectedOrder.items;

            const promises = productsToReturn.map(item => {
              return profileApi.createReturn({
                ...commonData,
                idProductoOriginal: Number(item.id),
                idProductoCambio: Number(item.id), // Siempre mismo modelo en masiva
                mismoModelo: true,
                pedidoCompleto: true,
                idLote: lotId,
                cantidad: Number(item.qty),
                precioUnitario: getPriceNum(item.price),
                talla: item.size
              });
            });
            await Promise.all(promises);
          } else {
            // Devolución Individual
            await profileApi.createReturn({
              ...commonData,
              idProductoOriginal: Number(selectedProduct.id),
              idProductoCambio: returnFormData.mismoModelo ? Number(selectedProduct.id) : (returnFormData.replacementProductId ? Number(returnFormData.replacementProductId) : null),
              mismoModelo: returnFormData.mismoModelo,
              pedidoCompleto: false,
              cantidad: Number(returnFormData.cantidad || 1),
              precioUnitario: getPriceNum(selectedProduct.price),
              talla: selectedProduct.size,
            });
          }

          setIsBulkReturn(false);
          loadProfileData();
        } catch (err) {
          console.error("Error submitting return:", err);
          const msg = err.response?.data?.message || "No se pudo enviar la solicitud.";
          showTopToast(msg);
        }
      },
      onCancel: () => {
        // Al cancelar, simplemente cerramos el modal sin hacer nada
        setConfirmModal(p => ({ ...p, open: false }));
      }
    });
  };

  const deactivateAccount = async () => {
    try {
      await profileApi.deactivateAccount();
      // Después de desactivar, cerramos sesión inmediatamente
      onLogout(); 
    } catch (error) {
      showTopToast("Error al desactivar la cuenta.");
    }
  };

  const deleteAccount = async () => {
    try {
      await profileApi.deleteAccountPermanently();
      // Después de eliminar, cerramos sesión inmediatamente
      onLogout();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al eliminar la cuenta.";
      showTopToast(msg);
    }
  };
  
  const handleMarkAsReceived = async (orderId) => {
    setConfirmModal({
      open: true,
      title: "Confirmar Entrega",
      message: "¿Confirmas que has recibido el pedido correctamente? Esta acción marcará la entrega como finalizada.",
      confirmText: "CONFIRMAR ENTREGA",
      onConfirm: async () => {
        // 🚀 OPTIMIZACIÓN EXTREMA: Actualizar UI antes de llamar a la API para respuesta instantánea
        const updateFn = o => (o.id === orderId || o.id === `PED-${orderId}`) ? { ...o, statusenvio: 'Entregado' } : o;
        
        setAllOrders(prev => prev.map(updateFn));
        setSelectedOrder(prev => (prev && (prev.id === orderId || prev.id === `PED-${orderId}`)) ? updateFn(prev) : prev);
        
        setConfirmModal(prev => ({ ...prev, open: false }));
        showTopToast("¡Gracias! El pedido ha sido finalizado.");

        try {
          await profileApi.markOrderAsReceived(orderId);
          loadProfileData(true); // Sincronización silenciosa final
        } catch (e) {
          showTopToast("Error al procesar, pero el estado se actualizará pronto.");
          loadProfileData(true);
        }
      }
    });
  };

  const CACHE_ORDERS = 'user_orders';
  const CACHE_RETURNS = 'user_returns';

  const [allOrders, setAllOrders] = useState(() => {
    const cached = NitroCache.get(CACHE_ORDERS);
    return Array.isArray(cached?.data) ? cached.data : [];
  });
  const [allReturns, setAllReturns] = useState(() => {
    const cached = NitroCache.get(CACHE_RETURNS);
    return Array.isArray(cached?.data) ? cached.data : [];
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);
  const [hasLoadedReturns, setHasLoadedReturns] = useState(false);

  const loadOrders = async (silent = false) => {
    if (!silent && !hasLoadedOrders) setIsLoadingData(true);
    try {
      const orders = await profileApi.getMyOrders();
      const mappedOrders = mapOrders(orders);
      setAllOrders(mappedOrders);
      NitroCache.set(CACHE_ORDERS, mappedOrders);
      setHasLoadedOrders(true);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadReturns = async (silent = false) => {
    if (!silent && !hasLoadedReturns) setIsLoadingData(true);
    try {
      const returns = await profileApi.getMyReturns();
      const mappedReturns = mapReturns(returns);
      setAllReturns(mappedReturns);
      NitroCache.set(CACHE_RETURNS, mappedReturns);
      setHasLoadedReturns(true);
    } catch (err) {
      console.error("Error loading returns:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProfileInfo = async () => {
    try {
      const perfil = await profileApi.getMiPerfil();
      if (perfil) {
        const profileData = Array.isArray(perfil) ? perfil[0] : perfil;
        updateProfileState(profileData);
      }
    } catch (err) {
      console.error("Error loading profile info:", err);
    }
  };

  const updateProfileState = (profileData) => {
    setAvatarUrl(profileData.avatarUrl || "");
    setFormData(prev => ({
      ...prev,
      documentType: profileData.tipoDocumento || profileData.TipoDocumentoTexto || profileData.TipoDocumento || prev.documentType,
      documentNumber: profileData.numeroDocumento || profileData.Documento || profileData.numero_documento || prev.documentNumber,
      name: profileData.nombreCompleto || profileData.Nombre || profileData.nombre || prev.name,
      phone: profileData.telefono || profileData.Telefono || profileData.phone || prev.phone,
      email: profileData.email || profileData.Email || profileData.Correo || prev.email,
      department: profileData.departamento || profileData.Departamento || prev.department,
      city: profileData.ciudad || profileData.Ciudad || prev.city,
      address: profileData.direccion || profileData.Direccion || prev.address
    }));
    setUser(prev => ({
      ...prev,
      ...profileData,
      Nombre: profileData.Nombre || profileData.nombreCompleto || profileData.nombre || prev?.Nombre,
      Telefono: profileData.Telefono || profileData.telefono || profileData.phone || prev?.Telefono,
      Correo: profileData.Email || profileData.email || profileData.Correo || prev?.Correo,
      Direccion: profileData.Direccion || profileData.direccion || prev?.Direccion
    }));
  };

  const mapOrders = (orders) => {
    const normalizeStatus = (order) => {
      const rawStatus = order.idEstado || order.IdEstado || order.estado || order.estadoVenta?.nombre || 'Pendiente';
      const lower = String(rawStatus).toLowerCase();
      if (lower.includes('completad') || lower.includes('aprob')) return 'Completada';
      if (lower.includes('rechaz') || lower.includes('anulad')) return 'Rechazado';
      return 'Pendiente';
    };

    const statusColorMap = {
      'Completada': '#10b981',
      'Rechazado': '#ef4444',
      'Anulado': '#6b7280',
      'Pendiente': '#FFC107'
    };

    const getImageUrl = (raw) => {
      if (!raw) return null;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (typeof raw === 'string') {
        if (raw.startsWith('/uploads')) return `${baseUrl}${raw}`;
        if (raw.includes("urlmovil-1.onrender.com")) return raw.replace("https://urlmovil-1.onrender.com", baseUrl);
      }
      return raw;
    };

    return orders.map(o => {
      const status = normalizeStatus(o);
      return {
        id: `PED-${10000 + o.id}`,
        date: new Date(o.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: `$${Number(o.total || 0).toLocaleString('es-CO')}`,
        status,
        statusColor: statusColorMap[status] || '#FFC107',
        statusenvio: o.statusenvio || o.StatusEnvio || 'Por enviar',
        paymentMethod: o.metodoPago,
        address: o.direccion || o.direccionEnvio || "Medellín, Colombia",
        phone: o.telefono || o.Telefono || o.Teléfono || null,
        receipt: getImageUrl(o.comprobante || o.Comprobante || o.evidencia),
        receipt2: getImageUrl(o.comprobante2 || o.Comprobante2),
        monto1: o.monto1 || 0,
        monto2: o.monto2 || 0,
        rejectionReason: o.motivoRechazo || o.MotivoRechazo || null,
        items: (o.detalles || []).map(d => ({
          id: d.idProducto || d.id,
          name: d.producto?.nombre || "Producto",
          price: `$${Number(d.precio || d.precioUnitario || d.producto?.precioVenta || 0).toLocaleString('es-CO')}`,
          size: d.talla || "U",
          qty: d.cantidad,
          image: d.producto?.imagenes?.[0] || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg"
        }))
      };
    });
  };

  const mapReturns = (returns) => {
    const getImageUrl = (raw) => {
      if (!raw) return null;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (typeof raw === 'string') {
        if (raw.startsWith('/uploads')) return `${baseUrl}${raw}`;
        if (raw.includes("urlmovil-1.onrender.com")) return raw.replace("https://urlmovil-1.onrender.com", baseUrl);
      }
      return raw;
    };

    return returns.map(r => {
      let statusName = r.idEstado || r.estado || "Pendiente";
      if (statusName === 1 || statusName === "1") statusName = "Completada";
      else if (statusName === 2 || statusName === "2") statusName = "Pendiente";
      else if (statusName === 3 || statusName === "3") statusName = "Rechazada";

      const originalItem = r.ventaOriginal?.detalles?.find(d => 
        String(d.idProducto) === String(r.idProducto)
      );

      const pImg = Array.isArray(r.productoInfo?.imagenes) ? r.productoInfo.imagenes[0] : null;

      const colorMap = {
        'Aprobada': '#10b981',
        'Completada': '#10b981',
        'Rechazada': '#ef4444',
        'Rechazado': '#ef4444',
        'Anulado': '#6b7280',
        'Anulada': '#6b7280',
        'Pendiente': '#FFC107'
      };

      return {
        id: `DEV-${r.noDevolucion || (10000 + r.id)}`,
        orderId: `PED-${10000 + r.idVenta}`,
        rawOrderId: r.idVenta,
        productId: r.idProducto,
        size: r.talla || originalItem?.talla || "U",
        quantity: r.cantidad || originalItem?.cantidad || 1,
        date: new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: statusName,
        statusColor: colorMap[statusName] || '#FFC107',
        productName: r.productoOriginal || r.nombreProductoOriginal || r.productoInfo?.nombre || "Producto",
        amount: `$${Number(r.precioUnitario || r.valor || 0).toLocaleString('es-CO')}`,
        reason: r.motivo || r.descripcion || "Cambio por talla",
        rejectionReason: r.observacion || null,
        productImage: getImageUrl(pImg) || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg",
        evidenceImage: getImageUrl(r.evidencia || r.evidenciaUrl) || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg",
        mismoModelo: (r.mismoModelo === true || r.MismoModelo === true) || (String(r.idProducto || r.IdProducto) === String(r.idProductoCambio || r.IdProductoCambio)),
        replacementProductName: r.productoCambio || r.ProductoCambio || r.producto_cambio || r.product_cambio,
        idLote: r.idLote || null,
        precio: parseFloat(r.valor || r.precioUnitario || 0)
      };
    });
  };

  const loadProfileData = async (silent = false) => {
    // Recarga todo si es necesario (p.ej. después de una acción)
    await Promise.all([
      loadProfileInfo(),
      loadOrders(silent),
      loadReturns(silent)
    ]);
  };

  useEffect(() => {
    if (authUser) {
      loadProfileInfo();
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (activeTab === 'account') {
      loadOrders();
      loadReturns();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'returns') {
      loadReturns();
    }
  }, [activeTab, authUser]);

  useEffect(() => {
    if (!authUser) return;

    // 📡 Listener de sincronización en tiempo real
    const channel = new BroadcastChannel('app_sync');
    channel.onmessage = (event) => {
      if (event.data === 'ventas_updated' || event.data === 'admin_sync') {
        console.log("🚀 Sync detectado: actualizando datos de perfil...");
        loadProfileData(true).then(() => {
          // Si el usuario tiene un pedido abierto, actualizarlo también
          if (selectedOrder) {
            setAllOrders(currentOrders => {
              const updated = currentOrders.find(o => o.id === selectedOrder.id);
              if (updated) setSelectedOrder(updated);
              return currentOrders;
            });
          }
        });
      }
    };

    const interval = setInterval(() => {
      if (activeTab === 'account' || activeTab === 'orders') loadOrders(true);
      if (activeTab === 'account' || activeTab === 'returns') loadReturns(true);
      loadProfileInfo();
    }, 45000); // 45s (Nitro Sync se encarga de lo inmediato)

    return () => {
      channel.close();
      clearInterval(interval);
    };
  }, [authUser, activeTab, selectedOrder]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.toLowerCase();
    return allOrders.filter(o => {
      const matchQuery = o.id.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
      const matchStatus = orderStatus === 'Todos' || o.status === orderStatus;
      return matchQuery && matchStatus;
    }).sort((a, b) => {
      const idA = parseInt(a.id.replace('PED-', ''));
      const idB = parseInt(b.id.replace('PED-', ''));
      return idB - idA;
    });
  }, [allOrders, orderQuery, orderStatus]);

  const groupedReturns = useMemo(() => {
    const grouped = [];
    const lotMap = new Map();

    allReturns.forEach(r => {
      if (r.idLote) {
        if (!lotMap.has(r.idLote)) {
          lotMap.set(r.idLote, {
            ...r,
            isLot: true,
            items: [r],
            totalAmount: parseFloat(r.precio || 0)
          });
          grouped.push(lotMap.get(r.idLote));
        } else {
          const lot = lotMap.get(r.idLote);
          lot.items.push(r);
          lot.totalAmount += parseFloat(r.precio || 0);
        }
      } else {
        grouped.push({ ...r, isLot: false });
      }
    });

    return grouped.sort((a, b) => {
      const dateB = new Date(b.date || b.fecha);
      const dateA = new Date(a.date || a.fecha);
      return dateB - dateA;
    });
  }, [allReturns]);

  const filteredReturns = useMemo(() => {
    const q = returnQuery.toLowerCase();
    return groupedReturns.filter(r => {
      const displayName = r.isLot ? "devolución de pedido" : r.productName;
      const matchQuery = r.id.toLowerCase().includes(q) || 
                         displayName.toLowerCase().includes(q) || 
                         r.status.toLowerCase().includes(q);
      const matchStatus = returnStatus === 'Todos' || r.status === returnStatus;
      return matchQuery && matchStatus;
    });
  }, [groupedReturns, returnQuery, returnStatus]);

  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);
  const paginatedReturns = filteredReturns.slice((returnsPage - 1) * ITEMS_PER_PAGE, returnsPage * ITEMS_PER_PAGE);
  const totalOrderPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const totalReturnPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);

  return {
    user, authUser, isAdmin, onLogout, isEditing, setIsEditing, toast, errors,
    formData, setFormData, showPolicyModal, setShowPolicyModal, showExpiredModal, setShowExpiredModal, expiredModalData, orderQuery, setOrderQuery,
    returnQuery, setReturnQuery, avatarUrl, showAvatarMenu, setShowAvatarMenu, fileInputRef,
    activeTab, setActiveTab, orderView, setOrderView, returnView, setReturnView,
    orderStatus, setOrderStatus, returnStatus, setReturnStatus, returnFormData, setReturnFormData,
    returnErrors, showReturnForm, ordersPage, setOrdersPage, returnsPage, setReturnsPage,
    selectedOrder, setSelectedOrder, selectedReturn, setSelectedReturn, selectedProduct,
    showImageModal, setShowImageModal, imageModalSrc, showSuccessModal, setShowSuccessModal,
    confirmModal, setConfirmModal, initialProducts, paginatedOrders, paginatedReturns,
    totalOrderPages, totalReturnPages, allOrders, allReturns, showTopToast,
    isBulkReturn, setIsBulkReturn, handleBulkReturnClick, groupedReturns,
    handleEditClick, handleSaveClick, handleChange, getAvatarInitial, openFilePicker,
    onPickAvatar, removeAvatar, openImage, handleReturnClick, handleContinueToReturn,
    handleReturnImageUpload, handleReturnSubmit, getPriceNum, deactivateAccount, deleteAccount,
    handleMarkAsReceived,
    BULK_MIN_QTY: 6
  };
};
