/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../../../shared/contexts';
import { PAYMENT_METHODS } from '../components/CheckoutModal';
import * as cartApi from '../services/cartApi';
import * as profileApi from '../../profile/services/profileApi';

export const useCartPage = () => {
  const { user } = useAuth();
  const { 
    cartItems, 
    addToCart,
    updateQuantity: updateCartQuantity, 
    removeFromCart: removeFromCartContext, 
    clearCart,
    cartTotal: total
  } = useCart();
  const subtotal = total;

  const [centerAlert, setCenterAlert] = useState({ visible: false, message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ id: null, talla: null });
  const [productToDeleteName, setProductToDeleteName] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [deliveryType, setDeliveryType] = useState('envio');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.Direccion || user?.direccion || user?.address || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.Telefono || user?.telefono || user?.telefono_db || user?.phone || '');
  const [receiptFile, setReceiptFile] = useState(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  
  const navigate = useNavigate();

  // Asegurar que se pre-llene si el usuario se carga después del montaje
  useEffect(() => {
    if (user) {
      setDeliveryAddress(prev => prev || user.Direccion || user.direccion || user.address || '');
      setDeliveryPhone(prev => prev || user.Telefono || user.telefono || user.telefono_db || user.phone || '');
      
      // Si todavía faltan datos, intentar buscar el perfil completo
      const fetchProfile = async () => {
        try {
          const perfil = await profileApi.getMiPerfil();
          if (perfil) {
            const pData = Array.isArray(perfil) ? perfil[0] : perfil;
            setDeliveryAddress(prev => prev || pData.direccion || pData.Direccion || pData.address || '');
            setDeliveryPhone(prev => prev || pData.telefono || pData.Telefono || pData.telefono_db || '');
          }
        } catch (err) {
          console.error("Error cargando perfil en checkout:", err);
        }
      };
      
      fetchProfile();
    }
  }, [user]);

  // Texto dinámico de envío
  const getShippingText = () => {
    if (deliveryType === 'recoger') return 'no aplica (recogida)';
    if (!selectedPaymentMethod) return '';
    const method = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
    if (method?.group === 'upfront') return 'no incluido';
    if (method?.group === 'delivery') return 'al recibir (efectivo)';
    return '';
  };

  const handleRemoveFromCart = (productId, talla, productName) => {
    setItemToDelete({ id: productId, talla });
    setProductToDeleteName(`${productName}${talla ? ` (${talla})` : ''}`);
    setShowDeleteConfirm(true);
  };

  const confirmRemoveFromCart = () => {
    removeFromCartContext(itemToDelete.id, itemToDelete.talla);
    setShowDeleteConfirm(false);
  };

  const cancelRemoveFromCart = () => {
    setShowDeleteConfirm(false);
  };

  const getStockForSize = (item) => {
    if (!item.tallasStock) return parseInt(item.stock) || 0;
    try {
      const stock = typeof item.tallasStock === 'string' ? JSON.parse(item.tallasStock) : item.tallasStock;
      const found = (Array.isArray(stock) ? stock : []).find(s => 
        String(s.talla || '').trim().toLowerCase() === String(item.talla || '').trim().toLowerCase()
      );
      if (found) return parseInt(found.cantidad) || 0;
      return 0;
    } catch {
      return parseInt(item.stock) || 0;
    }
  };

  const updateQuantity = (productId, talla, change) => {
    const item = cartItems.find(i => String(i.id) === String(productId) && String(i.talla) === String(talla));
    if (item) {
      const stock = getStockForSize(item);
      const currentQty = parseInt(item.quantity) || 1;
      let newQty = currentQty + change;
      
      if (newQty > stock) {
        newQty = stock;
      }
      
      if (newQty < 0) newQty = 0;
      updateCartQuantity(productId, talla, newQty);
    }
  };

  const handleManualQuantity = (productId, talla, val) => {
    const item = cartItems.find(i => String(i.id) === String(productId) && String(i.talla) === String(talla));
    if (!item) return;

    const raw = parseInt(val, 10);
    // Permite el 0 y el borrado (vacío)
    let newQty = Number.isNaN(raw) ? 0 : Math.max(0, raw);
    
    const stock = getStockForSize(item);
    if (newQty > stock) {
      newQty = stock;
    }
    
    updateCartQuantity(productId, talla, newQty);
  };

  const handleClearCart = () => setShowClearConfirm(true);

  const confirmClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const handleFinishPurchase = () => {
    if (cartItems.length === 0) {
      setCenterAlert({ visible: true, message: 'El carrito está vacío' });
      return;
    }
    // Verificar que ningún item tenga cantidad 0 o vacía
    const hasEmptyQty = cartItems.some(i => !parseInt(i.quantity) || parseInt(i.quantity) <= 0);
    if (hasEmptyQty) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setShowCheckout(true);
  };

  const cancelCheckout = () => setShowCheckout(false);

  const confirmPurchaseFromCheckout = async () => {
    if (!selectedPaymentMethod) {
      setCenterAlert({ visible: true, message: 'Por favor selecciona un método de pago' });
      return;
    }

    setIsProcessing(true);
    try {
      // Convertir comprobante a Base64 si existe
      let comprobanteBase64 = null;
      if (receiptFile) {
        comprobanteBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(receiptFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      }

      const orderData = {
        productos: cartItems.map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: item.quantity || 1,
          precio: item.precio,
          talla: item.talla || null,
          color: item.color || null,
        })),
        total,
        subtotal,
        metodoPago: selectedPaymentMethod,
        tipoEntrega: deliveryType,
        direccionEnvio: deliveryType === 'envio' ? deliveryAddress : 'Recogida en local',
        telefono: deliveryPhone || user?.telefono_db || user?.telefono,
        idCliente: user?.id,
        comprobante: comprobanteBase64
      };

      const result = await cartApi.createPedido(orderData);
      
      // La API devuelve directamente los datos del pedido o un objeto con success
      if (result) {
        setInvoiceData(result.data || result);
        setShowCheckout(false);
        setShowInvoice(true);
        clearCart();
      } else {
        setCenterAlert({ visible: true, message: 'Error al procesar el pedido' });
      }
    } catch (error) {
      console.error('Error al finalizar compra:', error);
      const msg = error?.response?.data?.message || error?.message || 'Ocurrió un error inesperado al procesar tu compra';
      setCenterAlert({ visible: true, message: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeInvoice = () => {
    setShowInvoice(false);
    setShowFinalMessage(true);
  };

  const finishAll = () => {
    setShowFinalMessage(false);
    navigate('/');
  };

  const getPriceInfo = (item) => {
    const isOffer = (item.has_discount || item.hasDiscount || item.oferta) && item.precioOferta;
    const qty = parseInt(item.quantity) || 1;
    
    let currentPrice = isOffer ? item.precioOferta : item.precio;
    if (qty >= 80 && parseFloat(item.precioMayorista80) > 0) currentPrice = item.precioMayorista80;
    else if (qty >= 6 && parseFloat(item.precioMayorista6) > 0) currentPrice = item.precioMayorista6;

    return {
      currentPrice,
      originalPrice: item.precio,
      isOffer,
      isWholesale: qty >= 6
    };
  };

  const getProductName = (item) => {
    return item?.nombre || 'Producto';
  };

  const getProductPrice = (item) => {
    if (!item) return 0;
    return getPriceInfo(item).currentPrice;
  };

  return {
    user,
    cartItems,
    total,
    subtotal,
    centerAlert,
    setCenterAlert,
    isProcessing,
    showClearConfirm,
    setShowClearConfirm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    productToDeleteName,
    showInvoice,
    showCheckout,
    invoiceData,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    deliveryType,
    setDeliveryType,
    deliveryAddress,
    setDeliveryAddress,
    deliveryPhone,
    setDeliveryPhone,
    receiptFile,
    setReceiptFile,
    selectedDetailProduct,
    setSelectedDetailProduct,
    showFinalMessage,
    showErrors,
    getShippingText,
    handleRemoveFromCart,
    confirmRemoveFromCart,
    cancelRemoveFromCart,
    updateQuantity,
    handleManualQuantity,
    handleClearCart,
    confirmClearCart,
    handleFinishPurchase,
    cancelCheckout,
    confirmPurchaseFromCheckout,
    closeInvoice,
    closeFinalMessage: finishAll,
    getPriceInfo,
    getStockForSize,
    getProductName,
    getProductPrice,
    getImageUrl: (item) => {
      if (!item) return 'https://via.placeholder.com/300x300?text=Sin+Imagen';
      const img = item.imagen || (Array.isArray(item.imagenes) ? item.imagenes[0] : null);
      if (!img) return 'https://via.placeholder.com/300x300?text=Sin+Imagen';
      if (img.startsWith('http')) return img;
      return `https://urlmovil-1.onrender.com${img}`;
    },
    handleImageError: (e) => {
      e.target.src = 'https://via.placeholder.com/300x300?text=No+Imagen';
    },
    getProductCategory: (item) => {
      return item?.categoria || item?.Categorium?.nombre || 'General';
    }
  };
};
