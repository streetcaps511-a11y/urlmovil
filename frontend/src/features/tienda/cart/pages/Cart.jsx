/* === PÁGINA PRINCIPAL === 
   Este componente es la interfaz visual principal de la ruta. 
   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */

import '../styles/Cart.css';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart, FaTimes, FaArrowLeft, FaWhatsapp } from 'react-icons/fa';

// Componentes importados
import InvoiceModal from '../components/InvoiceModal';
import ConfirmPurchaseModal from '../components/ConfirmPurchaseModal';
import CustomConfirm from '../components/CustomConfirm';
import CenterAlert from '../components/CenterAlert';
import CheckoutModal, { PAYMENT_METHODS } from '../components/CheckoutModal';
import CartHero from '../components/CartHero';



import { useCartPage } from '../hooks/useCartPage';

// ✨ COMPONENTE PRINCIPAL
const Cart = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    user,
    cartItems,
    total,
    subtotal,
    centerAlert,
    isProcessing,
    showClearConfirm,
    showDeleteConfirm,
    productToDeleteName,
    showInvoice,
    showCheckout,
    invoiceData,
    selectedPaymentMethod,
    deliveryType,
    deliveryAddress,
    deliveryPhone,
    receiptFile,
    selectedDetailProduct,
    showFinalMessage,
    setShowClearConfirm,
    setShowDeleteConfirm,
    setSelectedDetailProduct,
    setSelectedPaymentMethod,
    setDeliveryType,
    setDeliveryAddress,
    setDeliveryPhone,
    setReceiptFile,
    setCenterAlert,
    handleRemoveFromCart,
    confirmRemoveFromCart,
    updateQuantity,
    handleManualQuantity,
    handleClearCart,
    confirmClearCart,
    getImageUrl,
    getProductName,
    getProductPrice,
    getPriceInfo,
    getProductCategory,
    getStockForSize,
    handleImageError,
    handleFinishPurchase,
    confirmPurchaseFromCheckout,
    cancelCheckout,
    closeInvoice,
    closeFinalMessage,
    showErrors,
    getShippingText
  } = useCartPage();

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(cartItems.length / itemsPerPage);
  const currentItems = cartItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Estado LOCAL para mostrar el input de cantidad de forma independiente
  // Permite borrar hasta dejar vacío sin que CartContext lo fuerce a 1
  const [quantityDisplays, setQuantityDisplays] = React.useState({});

  // Sincronizar el display cuando cambia el carrito externamente (ej: botones + / -)
  React.useEffect(() => {
    const newDisplays = {};
    cartItems.forEach(item => {
      const key = `${item.id}_${item.talla}`;
      // Solo sincronizar si el usuario NO está editando ese campo
      if (quantityDisplays[key] === undefined || quantityDisplays[key] === String(item.quantity)) {
        newDisplays[key] = item.quantity === 0 ? '' : String(item.quantity);
      } else {
        newDisplays[key] = quantityDisplays[key];
      }
    });
    setQuantityDisplays(newDisplays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  // Asegurar que si borramos el último item de una página, regresemos a la anterior
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [cartItems.length, totalPages, currentPage]);

  // Renderizado: Carrito vacío
  if (cartItems.length === 0) {
    return (
      <div className="page-container" style={{ minHeight: '100vh', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '30px 20px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '6px' }}>
            <FaShoppingCart style={{ color: '#F5C81B', fontSize: '26px' }} />
            <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: '800', margin: 0 }}>Carrito de Compras</h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0' }}>Administra tus productos y avanza en tu compra</p>
        </div>

        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '40px 20px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '30px 20px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{
              fontSize: '40px',
              color: '#F5C81B',
              marginBottom: '20px'
            }}>
              🛒
            </div>
            <h2 style={{
              color: '#F5C81B',
              fontSize: '24px',
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              Tu carrito está vacío
            </h2>
            <p style={{
              color: '#CBD5E1',
              fontSize: '16px',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Agrega productos desde la tienda para verlos aquí
            </p>
            <Link 
              to="/" 
              style={{
                backgroundColor: '#F5C81B',
                padding: '12px 24px',
                color: '#000',
                fontWeight: 'bold',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '16px',
                border: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <FaShoppingCart /> Ir a la Tienda
            </Link>
          </div>
        </div>

      </div>
    );
  }

  // Renderizado: Carrito con productos
  return (
    <div className="page-container" style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#030712' }}>
      <CartHero />
      
      <CustomConfirm 
        isOpen={showClearConfirm} 
        onConfirm={confirmClearCart} 
        onCancel={() => setShowClearConfirm(false)} 
        title="¿Vaciar carrito?" 
        message="¿Estás seguro que deseas eliminar todos los productos del carrito? Esta acción no se puede deshacer." 
        confirmText="Vaciar Carrito" 
        cancelText="Cancelar" 
        type="warning" 
      />
      
      <CustomConfirm 
        isOpen={showDeleteConfirm} 
        onConfirm={confirmRemoveFromCart} 
        onCancel={() => { 
          setShowDeleteConfirm(false); 
          setProductToDeleteName(''); 
        }} 
        title="¿Eliminar producto?" 
        message="¿Estás seguro que deseas eliminar este producto del carrito?" 
        productName={productToDeleteName} 
        confirmText="Eliminar" 
        cancelText="Cancelar" 
        type="warning" 
      />
      
      <CenterAlert 
        message={centerAlert.message} 
        isVisible={centerAlert.visible} 
        onClose={() => setCenterAlert({ visible: false, message: '' })} 
      />
      
      <CheckoutModal
        isOpen={showCheckout}
        onClose={cancelCheckout}
        onConfirm={confirmPurchaseFromCheckout}
        total={total}
        subtotal={subtotal}
        selectedMethod={selectedPaymentMethod}
        setSelectedMethod={setSelectedPaymentMethod}
        deliveryType={deliveryType}
        setDeliveryType={setDeliveryType}
        address={deliveryAddress}
        setAddress={setDeliveryAddress}
        phone={deliveryPhone}
        setPhone={setDeliveryPhone}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
        isProcessing={isProcessing}
        cartItems={cartItems}
        getProductName={getProductName}
        getProductPrice={getProductPrice}
        user={user}
      />
      
      {showInvoice && invoiceData && (
        <InvoiceModal 
          isOpen={showInvoice} 
          onClose={closeInvoice} 
          invoiceData={invoiceData} 
        />
      )}

      {showFinalMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001, padding: '15px' }}>
          <div style={{ background: '#1E293B', color: 'white', borderRadius: '16px', width: '100%', maxWidth: '420px', border: '1px solid #F5C81B', padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#F5C81B', fontSize: '18px', fontWeight: 'bold', margin: '0 0 14px 0' }}>Pedido registrado</h3>
            <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              Su pedido se encuentra en espera de su revisión. Puede consultar los detalles en su perfil.
            </p>
            <button onClick={closeFinalMessage} style={{ padding: '12px 40px', backgroundColor: '#F5C81B', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s ease' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {selectedDetailProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '15px' }} onClick={() => setSelectedDetailProduct(null)}>
          <div style={{ background: '#1E293B', borderRadius: '16px', width: '100%', maxWidth: '500px', border: '1px solid #F5C81B', padding: '0', position: 'relative', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedDetailProduct(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#F5C81B', fontSize: '18px', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <FaTimes />
            </button>
            <img src={getImageUrl(selectedDetailProduct)} alt={getProductName(selectedDetailProduct)} style={{ width: '100%', height: '320px', objectFit: 'cover' }} onError={handleImageError} />
            <div style={{ padding: '24px' }}>
              <h2 style={{ color: '#F5C81B', fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0' }}>{getProductName(selectedDetailProduct)}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#CBD5E1', backgroundColor: 'rgba(51, 65, 85, 0.7)', padding: '4px 10px', borderRadius: '8px' }}>{getProductCategory(selectedDetailProduct)}</span>
                {selectedDetailProduct.color && <span style={{ fontSize: '12px', color: '#CBD5E1', backgroundColor: 'rgba(51, 65, 85, 0.7)', padding: '4px 10px', borderRadius: '8px' }}>Color: {selectedDetailProduct.color}</span>}
                {selectedDetailProduct.talla && <span style={{ fontSize: '12px', color: '#CBD5E1', backgroundColor: 'rgba(51, 65, 85, 0.7)', padding: '4px 10px', borderRadius: '8px' }}>Talla: {selectedDetailProduct.talla}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Cantidad en carrito:</span>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>{selectedDetailProduct.quantity || 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Precio unitario:</span>
                <span style={{ color: '#F5C81B', fontSize: '20px', fontWeight: 'bold' }}>${getProductPrice(selectedDetailProduct).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
            
            {/* LISTA DE PRODUCTOS */}
            <div style={{ flex: 1, minWidth: '320px', maxWidth: '750px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ color: '#F5C81B', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  Productos seleccionados ({cartItems.length})
                </h2>
              </div>

              {currentItems.map((item, index) => {
                const precio = getProductPrice(item);
                const quantity = item.quantity || 1;
                const productName = getProductName(item);
                const isQtyZero = !parseInt(item.quantity) || parseInt(item.quantity) <= 0;
                
                return (
                    <div 
                      key={`${index}-${item.id}`} 
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        padding: '18px', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '20px', 
                        marginBottom: '20px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                        border: isQtyZero && showErrors ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                    {/* Imagen */}
                      <img 
                      src={getImageUrl(item)} 
                      alt={productName} 
                      style={{ 
                        width: '85px', 
                        height: '85px', 
                        borderRadius: '12px', 
                        objectFit: 'cover', 
                        cursor: 'pointer',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.1)'
                      }} 
                      onError={handleImageError}
                      onClick={() => setSelectedDetailProduct(item)}
                    />

                    {/* Info + controles en una sola fila */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>

                      {/* Nombre + badges */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 
                          style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          onClick={() => setSelectedDetailProduct(item)}
                        >
                          {productName}
                        </h3>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {getProductCategory(item)}
                          </span>
                          {item.talla && (
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              Talla: {item.talla}
                            </span>
                          )}
                          {getStockForSize(item) === 0 && (
                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ef4444', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              AGOTADO
                            </span>
                          )}
                          {getStockForSize(item) > 0 && item.quantity > getStockForSize(item) && (
                            <span style={{ fontSize: '10px', color: '#FFC107', fontWeight: '800', backgroundColor: 'rgba(255, 193, 7, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #FFC107', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              SOLO {getStockForSize(item)} DISP.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selector de cantidad - pill redondeado más delgado */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(245,200,27,0.4)', borderRadius: '6px', padding: '1px', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                          <button 
                            onClick={() => {
                              if ((item.quantity || 0) <= 0) return;
                              const key = `${item.id}_${item.talla}`;
                              const newQty = Math.max(0, (item.quantity || 0) - 1);
                              updateQuantity(item.id, item.talla, -1);
                              setQuantityDisplays(prev => ({ ...prev, [key]: String(newQty) }));
                            }} 
                            disabled={(item.quantity || 0) <= 0}
                            style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'transparent', border: 'none', color: (item.quantity || 0) <= 0 ? '#444' : '#F5C81B', cursor: (item.quantity || 0) <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <FaMinus size={7} />
                          </button>
                          <input 
                            type="number"
                            value={quantityDisplays[`${item.id}_${item.talla}`] ?? (item.quantity === 0 ? '' : item.quantity)}
                            onChange={(e) => {
                              const key = `${item.id}_${item.talla}`;
                              const raw = e.target.value;
                              // Actualizar solo el display local, sin tocar el carrito todavía
                              setQuantityDisplays(prev => ({ ...prev, [key]: raw }));
                            }}
                            onBlur={(e) => {
                              const key = `${item.id}_${item.talla}`;
                              const parsed = parseInt(e.target.value);
                              const finalQty = isNaN(parsed) ? 0 : Math.max(0, parsed);
                              // Ahora sí actualizamos el carrito
                              handleManualQuantity(item.id, item.talla, String(finalQty));
                              setQuantityDisplays(prev => ({ ...prev, [key]: finalQty === 0 ? '' : String(finalQty) }));
                            }}
                            style={{ width: '38px', border: 'none', background: 'transparent', color: '#fff', textAlign: 'center', fontSize: '11px', fontWeight: '600', outline: 'none' }}
                          />
                          <button 
                            onClick={() => {
                              const key = `${item.id}_${item.talla}`;
                              const newQty = (item.quantity || 0) + 1;
                              updateQuantity(item.id, item.talla, 1);
                              setQuantityDisplays(prev => ({ ...prev, [key]: String(Math.min(newQty, getStockForSize(item))) }));
                            }} 
                            disabled={item.quantity >= getStockForSize(item)}
                            style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'transparent', border: 'none', color: item.quantity >= getStockForSize(item) ? '#333' : '#F5C81B', cursor: item.quantity >= getStockForSize(item) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <FaPlus size={7} />
                          </button>
                        </div>
                        {/* 🔥 STOCK DISPONIBLE (Solo si es bajo o se alcanza) */}
                        {item.quantity >= getStockForSize(item) && (
                          <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: '600' }}>
                            Hay {getStockForSize(item)} disp.
                          </span>
                        )}

                        {/* ⚠️ ERROR DE CANTIDAD INLINE */}
                        {isQtyZero && showErrors && (
                          <span style={{ color: '#ef4444', fontSize: '9px', fontWeight: 'bold', marginTop: '2px', textAlign: 'center' }}>
                            ⚠️ Selecciona cantidad
                          </span>
                        )}
                      </div>

                      {/* Precio */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: 'rgba(245,200,27,0.6)', fontWeight: '600' }}>
                          ${Math.round(getPriceInfo(item).currentPrice).toLocaleString()} c/u
                        </div>
                        <div style={{ fontSize: '14px', color: '#F5C81B', fontWeight: '700' }}>
                          ${(Math.round(getPriceInfo(item).currentPrice) * (item.quantity || 1)).toLocaleString()}
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button 
                        onClick={() => handleRemoveFromCart(item.id, item.talla, productName)} 
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', flexShrink: 0 }}
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', marginBottom: '30px' }}>
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : '#1E293B', 
                        color: currentPage === 1 ? '#4b5563' : '#F5C81B',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Anterior
                    </button>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                      Página <span style={{ color: '#F5C81B' }}>{currentPage}</span> de {totalPages}
                    </div>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : '#1E293B', 
                        color: currentPage === totalPages ? '#4b5563' : '#F5C81B',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Siguiente
                    </button>
                </div>
              )}
            </div>

            {/* RESUMEN */}
            <div style={{ width: '350px', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '15px' }}>
                <Link to="/" style={{ flex: 1, background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}>
                  <FaArrowLeft size={12} /> Seguir
                </Link>
                <button onClick={handleClearCart} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <FaTrash size={12} /> Vaciar
                </button>
              </div>
              
              <div style={{ background: 'transparent', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245,200,27,0.25)' }}>
                <h2 style={{ color: '#F5C81B', margin: '0 0 20px 0', textAlign: 'center', fontSize: '16px', fontWeight: '800' }}>
                  Resumen del Pedido
                </h2>
                
                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Productos ({cartItems.length}):</span>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>${subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Envío:</span>
                    <span style={{ color: '#F5C81B', fontSize: '12px', fontStyle: 'italic' }}>{getShippingText()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', marginBottom: '25px' }}>
                  <strong style={{ color: '#fff' }}>Total:</strong>
                  <strong style={{ color: '#F5C81B' }}>${total.toLocaleString()}</strong>
                </div>

                <button 
                  onClick={handleFinishPurchase}
                  disabled={isProcessing}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    backgroundColor: '#F5C81B', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#000', 
                    fontWeight: '900', 
                    cursor: isProcessing ? 'not-allowed' : 'pointer', 
                    fontSize: '15px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    opacity: isProcessing ? 0.75 : 1,
                    transition: 'opacity 0.2s ease' 
                  }}
                >
                  {isProcessing ? (
                    <>
                      <div className="gm-spinner-small" style={{ width: '16px', height: '16px', borderTopColor: '#000', borderColor: 'rgba(0,0,0,0.2)', borderTopWidth: '2px' }}></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FaWhatsapp size={18} /> CONTINUAR
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
