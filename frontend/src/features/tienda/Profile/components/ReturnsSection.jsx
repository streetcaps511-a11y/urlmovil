/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react'; // Refined Return Form with Order Summary Support
import { 
  FaExchangeAlt, FaSearch, FaTimes, FaChevronLeft, 
  FaChevronRight, FaArrowLeft, FaUser, FaCamera, FaTrash,
  FaCheckCircle, FaArrowDown, FaShoppingBag, FaEye
} from "react-icons/fa";
import { RejectionReasonModal } from './ProfileModals';
import '../styles/ReturnsSection.css';

const StatusBadge = ({ status, color }) => (
  <div className="gm-status-badge" style={{ backgroundColor: `${color}10`, color: color, border: `1px solid ${color}` }}>
    <span className="gm-status-point" style={{ backgroundColor: color }} />
    {status}
  </div>
);

const FaChevronDown = ({ style }) => (
  <svg 
    stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" 
    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={style}
  >
    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
  </svg>
);

const ReturnsSection = ({ 
  returnView, setReturnView, returnStatus, setReturnStatus, 
  returnQuery, setReturnQuery, paginatedReturns, returnsPage, 
  setReturnsPage, totalReturnPages, selectedReturn, setSelectedReturn, 
  handleReturnSubmit, returnFormData, setReturnFormData, returnErrors,
  selectedProduct, initialProducts, getPriceNum, handleReturnImageUpload,
  formData, isBulkReturn, selectedOrder, setActiveTab
}) => {
  const [showBulkItems, setShowBulkItems] = React.useState(false);
  const [detailProdsPage, setDetailProdsPage] = React.useState(1);
  const [showRejectionModal, setShowRejectionModal] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState(null);

  React.useEffect(() => {
    setDetailProdsPage(1);
  }, [selectedReturn?.id]);

  // Componente para ver la imagen en grande
  const ImageLightbox = () => {
    if (!previewImage) return null;
    return (
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'transparent', 
          zIndex: 9999,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          paddingLeft: '250px', // Deja el espacio del menú
          cursor: 'default'
        }}
        onClick={() => setPreviewImage(null)}
      >
        <div 
          style={{ 
            position: 'relative', 
            display: 'inline-block',
            marginTop: '80px'
          }} 
          onClick={e => e.stopPropagation()}
        >
          <button 
            style={{ 
              position: 'absolute', top: '15px', right: '15px', 
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.4)', 
              color: '#fff', cursor: 'pointer', width: '32px', height: '32px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000
            }}
            onClick={() => setPreviewImage(null)}
          >
            <FaTimes size={16} />
          </button>
          <img 
            src={previewImage} 
            style={{ 
              width: 'auto',
              height: '75vh', // Grande pero con aire
              maxWidth: '85vw', 
              objectFit: 'contain', 
              display: 'block',
              userSelect: 'none',
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              cursor: 'default' // Forzamos puntero normal
            }} 
            alt="Vista ampliada" 
          />
        </div>
      </div>
    );
  };

  if (returnView === 'list') {
    return (
      <div className="gm-returns-section">
        <div className="gm-returns-header">
          <div className="gm-section-header">
            <div className="gm-section-title-wrapper">
              <FaExchangeAlt color="#FFC107" size={20} />
              <h3 className="gm-section-title">Devoluciones</h3>
            </div>
          </div>

          <div className="gm-filter-bar">
            <div className="gm-status-filters">
              {['Todos', 'Pendiente', 'Aprobado', 'Rechazado'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setReturnStatus(s)} 
                  className={`gm-status-filter-btn ${returnStatus === s ? 'active' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="gm-search-wrapper">
              <FaSearch className="gm-search-icon" size={14} />
              <input 
                value={returnQuery} 
                onChange={(e) => setReturnQuery(e.target.value)} 
                placeholder="Buscar devolución..." 
                className="gm-search-input"
              />
              {returnQuery && (
                <FaTimes 
                  onClick={() => setReturnQuery("")} 
                  className="gm-clear-icon"
                  size={12} 
                />
              )}
            </div>
          </div>
        </div>

        <div className="gm-orders-list">
          {paginatedReturns.length > 0 ? (
            <>
              {paginatedReturns.map(r => (
                <div key={r.id} onClick={() => { setSelectedReturn(r); setReturnView('detail'); }} className="gm-return-card">
                  <div className="gm-return-left-content">
                    <div className="gm-return-img-wrapper">
                      {r.isLot ? (
                        <div style={{ background: 'rgba(255,193,7,0.1)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <FaShoppingBag color="#FFC107" size={24} />
                        </div>
                      ) : (
                        <img src={r.productImage} className="gm-return-product-img" alt={r.productName} />
                      )}
                    </div>
                    <div className="gm-return-info-group">
                      <div className="gm-return-name">{r.isLot ? "Devolución de Pedido" : r.productName}</div>
                      <span className="gm-return-id" style={{ color: r.isLot ? '#FFC107' : 'rgba(255,255,255,0.4)' }}>
                        {r.isLot ? `LOT: ${r.id.substring(r.id.length - 8).toUpperCase()}` : r.id.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="gm-return-right-content">
                    <div className="gm-return-amount">
                      {r.isLot ? `$${r.totalAmount.toLocaleString('es-CO')}` : r.amount}
                    </div>
                    <StatusBadge status={r.status} color={r.statusColor} />
                  </div>
                </div>
              ))}

              {totalReturnPages > 1 && (
                <div className="gm-pagination">
                  <button 
                    onClick={() => setReturnsPage(p => Math.max(1, p - 1))} 
                    disabled={returnsPage === 1}
                    className="gm-pagination-btn"
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  {[...Array(totalReturnPages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setReturnsPage(i + 1)} 
                      className={`gm-page-num-btn ${returnsPage === i + 1 ? 'active' : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => setReturnsPage(p => Math.min(totalReturnPages, p + 1))} 
                    disabled={returnsPage === totalReturnPages}
                    className="gm-pagination-btn"
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>No hay devoluciones registradas.</div>
          )}
        </div>
        <ImageLightbox />
      </div>
    );
  }

  if (returnView === 'detail' && selectedReturn) {
    const PRODS_PER_PAGE = 3;

    const returnItems = selectedReturn?.isLot 
      ? selectedReturn.items.map(it => ({
          id: it.id,
          name: it.productName,
          price: it.amount,
          size: it.size,
          qty: it.quantity,
          image: it.productImage
        }))
      : selectedReturn ? [{
          id: selectedReturn.id,
          name: selectedReturn.productName,
          price: selectedReturn.amount,
          size: selectedReturn.size,
          qty: selectedReturn.quantity,
          image: selectedReturn.productImage
        }] : [];

    const totalProdsPages = Math.ceil(returnItems.length / PRODS_PER_PAGE);
    const paginatedItems = returnItems.slice(
      (detailProdsPage - 1) * PRODS_PER_PAGE, 
      detailProdsPage * PRODS_PER_PAGE
    );

    return (
      <div className="gm-order-detail">
        <div className="gm-detail-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => setReturnView('list')} className="gm-back-btn-circle" title="Volver">
              <FaArrowLeft />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h3 className="gm-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Solicitud {selectedReturn.id}</h3>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"Montserrat", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vinculada al pedido: {selectedReturn.orderId}
              </span>
            </div>
          </div>

          <div className="gm-header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StatusBadge status={selectedReturn.status} color={selectedReturn.statusColor} />
            {(selectedReturn.status === "Rechazado" || selectedReturn.rejectionReason) && (
              <button 
                className="gm-ver-motivo-btn"
                style={{ 
                  borderColor: selectedReturn.statusColor || '#ef4444', 
                  color: selectedReturn.statusColor || '#ef4444',
                  height: '36px'
                }}
                onClick={() => setShowRejectionModal(true)}
              >
                <FaEye size={12} /> Ver motivo
              </button>
            )}
          </div>
        </div>

        <div className="gm-detail-content">
          <div className="gm-detail-products-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h4 className="gm-detail-block-title" style={{ fontSize: '1rem', color: '#fff', fontWeight: 400, margin: 0, textTransform: 'none', fontFamily: '"Montserrat", sans-serif', letterSpacing: '0.5px' }}>
                {selectedReturn.isLot ? "Productos en este lote" : "Producto de la solicitud"}
              </h4>
              
              {totalProdsPages > 1 && (
                <div className="gm-mini-pagination">
                  <button 
                    onClick={() => setDetailProdsPage(p => Math.max(1, p - 1))}
                    disabled={detailProdsPage === 1}
                    className="gm-mini-pagination-btn"
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  <span className="gm-mini-pagination-info">{detailProdsPage} / {totalProdsPages}</span>
                  <button 
                    onClick={() => setDetailProdsPage(p => Math.min(totalProdsPages, p + 1))}
                    disabled={detailProdsPage === totalProdsPages}
                    className="gm-mini-pagination-btn"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              )}
            </div>

            {paginatedItems.map(i => (
              <div key={i.id} className="gm-order-temu-item ultra-slim-row" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '5px 20px', marginBottom: '10px', overflow: 'hidden' }}>
                <div 
                  className="gm-product-img-wrapper" 
                  style={{ position: 'relative', width: '60px', height: '60px', minWidth: '60px', cursor: 'pointer' }}
                  onClick={() => setPreviewImage(i.image)}
                >
                  <img src={i.image} className="gm-order-item-img" alt={i.name} style={{ width: '100%', height: '100%', background: '#000' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.5rem', textAlign: 'center', padding: '2px 0' }}>Ver más</div>
                </div>
                
                <div className="gm-item-ultra-horizontal-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '25px', flex: 1 }}>
                    <span className="gm-item-name" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '400', whiteSpace: 'nowrap', fontFamily: '"Montserrat", sans-serif' }}>
                      {i.name}
                    </span>
                    
                    <div className="gm-item-spec-info" style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: '"Outfit", sans-serif' }}>
                      Talla: {i.size} <span style={{ margin: '0 10px', opacity: 0.15, color: 'rgba(255,255,255,0.3)' }}>|</span> Cantidad: {i.qty}
                    </div>
                  </div>

                  <div className="gm-item-action-price-group">
                    <span className="gm-item-price" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#FFC107', minWidth: '90px', textAlign: 'right', fontFamily: '"Outfit", sans-serif' }}>
                      ${( (typeof i.price === 'string' ? parseInt(i.price.replace(/[^0-9]/g, '')) : i.price) * (parseInt(i.qty) || 1) ).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gm-detail-top-info-grid">
          <div className="gm-summary-info-box">
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">Fecha de solicitud:</label>
              <div className="gm-info-value-premium">{selectedReturn.date}</div>
            </div>
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">Recibe:</label>
              <div className="gm-info-value-premium" style={{ color: '#FFC107' }}>
                {selectedReturn.mismoModelo ? "Mismo modelo" : (selectedReturn.replacementProductName || "Reemplazo")}
              </div>
            </div>
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">Cliente:</label>
              <div className="gm-info-value-premium">
                <FaUser size={12} color="#FFC107" style={{ marginRight: '10px' }} />
                {formData.name || 'Usuario Gorras Medellín'}
              </div>
            </div>
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">Motivo informado:</label>
              <div className="gm-info-value-premium" style={{ lineHeight: '1.6' }}>{selectedReturn.reason}</div>
            </div>
          </div>

          <div className="gm-summary-receipt-box">
            <div className="gm-summary-field" style={{ width: '100%', marginBottom: '25px' }}>
              <label className="gm-info-label-premium">Valor del cambio:</label>
              <div className="gm-info-value-premium total" style={{ color: '#00ff88', fontSize: '1.8rem' }}>
                {selectedReturn.isLot ? `$${selectedReturn.totalAmount.toLocaleString('es-CO')}` : selectedReturn.amount}
              </div>
            </div>
            
            <label className="gm-info-label-premium">Evidencia fotográfica:</label>
            <div className="gm-receipt-container-premium" onClick={() => setPreviewImage(selectedReturn.evidenceImage)} style={{ cursor: 'zoom-in' }}>
              <div className="gm-receipt-wrapper-premium">
                <img src={selectedReturn.evidenceImage} alt="Evidencia" className="gm-receipt-img-premium" style={{ objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        </div>
        
        {showRejectionModal && (
          <RejectionReasonModal 
            reason={selectedReturn.rejectionReason || "No se especificó un motivo."} 
            onClose={() => setShowRejectionModal(false)} 
          />
        )}
        <ImageLightbox />
      </div>
    );
  }


  // FORMULARIO DE SOLICITUD
  return (
    <div className="gm-return-form">
      <div className="gm-section-header" style={{ marginBottom: '45px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div 
            onClick={() => {
              if (selectedProduct?.orderId) {
                // Si venía de un pedido, volvemos a la lista de pedidos
                setActiveTab('orders');
                setReturnView('list');
              } else {
                setReturnView('list');
              }
            }} 
            className="gm-back-arrow-btn"
            title="Volver"
            style={{ 
              cursor: 'pointer', 
              color: '#FFC107', 
              fontSize: '1.4rem', 
              display: 'flex', 
              alignItems: 'center', 
              transition: 'transform 0.2s' 
            }}
          >
            <FaArrowLeft />
          </div>
          <h3 className="gm-section-title" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '1.4rem', color: '#fff', margin: 0 }}>
            {isBulkReturn ? "Solicitud de cambio del pedido" : "Solicitud de Cambio"}
          </h3>
        </div>
        <button onClick={handleReturnSubmit} className="gm-form-submit-btn-outline" style={{ fontWeight: 400, fontFamily: '"Montserrat", sans-serif', fontSize: '0.9rem', border: '1px solid #FFC107', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', color: '#FFC107', padding: '10px 22px' }}>
          <FaCheckCircle /> ENVIAR SOLICITUD
        </button>
      </div>
      
      <div className="gm-return-form-grid-responsive">
        
        <div className="gm-form-column-left">
          {/* Bloque 1: Producto a devolver */}
          <div className="gm-form-glass-card-simple" style={{ marginBottom: '15px' }}>
            <h4 className="gm-form-card-title-white" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
              {isBulkReturn ? "1. Productos a devolver (Todo el pedido)" : "1. Producto a devolver"}
            </h4>
            <div className="gm-return-product-summary-compact" style={{ padding: '0', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', maxWidth: '500px', overflow: 'hidden' }}>
              {isBulkReturn ? (
                <>
                  {/* Tarjeta de Resumen de Pedido */}
                  <div 
                    onClick={() => setShowBulkItems(!showBulkItems)}
                    style={{ 
                      padding: '16px 20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      cursor: 'pointer',
                      background: showBulkItems ? 'rgba(255,255,255,0.05)' : 'transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="gm-bulk-order-icon-box" style={{ background: 'rgba(255, 193, 7, 0.1)', padding: '10px', borderRadius: '10px' }}>
                        <FaShoppingBag color="#FFC107" size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, letterSpacing: '0.5px' }}>{selectedOrder?.id || 'PED-XX'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{selectedOrder?.date || 'Fecha'} • {selectedOrder?.total || '$0'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#FFC107', fontWeight: 600 }}>{showBulkItems ? 'OCULTAR PRODUCTOS' : 'VER PRODUCTOS'}</span>
                      <FaChevronDown style={{ transform: showBulkItems ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', fontSize: '10px', color: '#FFC107' }} />
                    </div>
                  </div>

                  {/* Lista Desplegable de Productos */}
                  {showBulkItems && (
                    <div style={{ padding: '10px 15px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {selectedOrder?.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 5px', borderBottom: idx === selectedOrder.items.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }}>
                          <img src={item.image} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} alt={item.name} />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontSize: '0.8rem', color: '#eee', fontWeight: 500 }}>{item.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>Talla: {item.size} • Cant: {item.qty}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#4ADE80', fontWeight: 600 }}>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <img src={selectedProduct.image} style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} alt={selectedProduct.name} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 400, letterSpacing: '0.5px', opacity: 0.8 }}>DEVOLVIENDO:</span>
                      <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '400', fontFamily: '"Montserrat", sans-serif' }}>
                        {selectedProduct.name.charAt(0).toUpperCase() + selectedProduct.name.slice(1).toLowerCase()}
                      </span>
                      <span style={{ color: '#FFC107', fontSize: '0.85rem', fontWeight: 700 }}>{selectedProduct.price}</span>
                    </div>
                  </div>
                  
                  {/* Selector de Cantidad */}
                  {selectedProduct.maxQty > 1 && (
                    <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,193,7,0.02)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>CANTIDAD A DEVOLVER:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="gm-qty-selector-minimal">
                          <button 
                            onClick={() => setReturnFormData({...returnFormData, cantidad: Math.max(1, returnFormData.cantidad - 1)})}
                            className="gm-qty-btn"
                            type="button"
                          >
                            -
                          </button>
                          <span className="gm-qty-number">{returnFormData.cantidad}</span>
                          <button 
                            onClick={() => setReturnFormData({...returnFormData, cantidad: Math.min(selectedProduct.maxQty, returnFormData.cantidad + 1)})}
                            className="gm-qty-btn"
                            type="button"
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>de {selectedProduct.maxQty} compradas</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Total Dinámico */}
                  {returnFormData.cantidad > 1 && (
                    <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,255,136,0.05)', borderTop: '1px solid rgba(0,255,136,0.1)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#00ff88', fontWeight: 600 }}>
                        VALOR TOTAL DEL CAMBIO: ${ (getPriceNum(selectedProduct.price) * returnFormData.cantidad).toLocaleString('es-CO') }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Motivo del cambio */}
          <div className="gm-form-glass-card-simple" style={{ marginBottom: '35px' }}>
            <h4 className="gm-form-card-title-white" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '1rem', color: '#fff', marginBottom: '15px' }}>2. Motivo del cambio : *</h4>
            <textarea 
              value={returnFormData.reason} 
              onChange={e => setReturnFormData({...returnFormData, reason: e.target.value})} 
              placeholder="Explica brevemente..." 
              className={`gm-form-textarea-premium ${returnErrors.reason ? 'error' : ''}`}
              style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '0.95rem', height: '100px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '500px' }}
            />
          </div>

          {/* Bloque 3: Producto de reemplazo */}
          {!isBulkReturn && (
            <div className="gm-form-glass-card-simple" style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', width: '100%', maxWidth: '490px' }}>
                <h4 className="gm-form-card-title-white" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '0.9rem', color: '#fff', margin: 0 }}>3. Producto de reemplazo</h4>
                <label 
                  onClick={() => setReturnFormData({...returnFormData, mismoModelo: !returnFormData.mismoModelo})}
                  className="gm-slender-switch-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <div className={`gm-slender-track ${returnFormData.mismoModelo ? 'active' : ''}`}>
                    <div className="gm-slender-knob" />
                  </div>
                  <span style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '0.85rem', color: '#fff' }}>Mismo modelo</span>
                </label>
              </div>
              
              {!returnFormData.mismoModelo ? (
                <div className="gm-replacement-select-box" style={{ maxWidth: '500px' }}>
                  <select 
                    value={returnFormData.replacementProductId} 
                    onChange={e => setReturnFormData({...returnFormData, replacementProductId: e.target.value})} 
                    className={`gm-select-minimalist ${returnErrors.replacement ? 'error' : ''}`}
                    style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '1rem', width: '100%' }}
                  >
                    <option value="">Seleccionar reemplazo...</option>
                    {initialProducts
                      ?.filter(p => {
                        const currentPrice = Math.floor(Number(p.precio));
                        const targetPrice = getPriceNum(selectedProduct?.price);
                        const hasSameSize = p.tallas?.includes(selectedProduct?.size);
                        return currentPrice === targetPrice && hasSameSize;
                      })
                      ?.map((p, idx) => (
                        <option key={`${p.id}-${idx}`} value={p.id}>
                          {p.nombre} (${Number(p.precio).toLocaleString('es-CO')})
                        </option>
                      ))
                    }
                  </select>
                </div>
              ) : (
                <div className="gm-mismo-modelo-info-row" style={{ padding: '16px 22px', border: '1px solid rgba(255, 193, 7, 0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '500px' }}>
                  <FaCheckCircle style={{ color: '#FFC107', fontSize: '1rem' }} />
                  <img src={selectedProduct.image} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="Mismo" />
                  <span style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '0.9rem', color: '#fff' }}>Unidad nueva del mismo modelo.</span>
                </div>
              )}
            </div>
          )}
          
          {isBulkReturn && (
             <div style={{ marginBottom: '35px' }}>
               {/* Sección de reemplazo eliminada por petición */}
             </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Solo Evidencia */}
        <div className="gm-form-column-right" style={{ paddingLeft: '35px' }}>
          <div className={`gm-form-glass-card-simple ${returnErrors.evidence ? 'error' : ''}`} style={{ position: 'sticky', top: '20px' }}>
            <h4 className="gm-form-card-title-white" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '1rem', color: '#fff', marginBottom: '10px' }}>
              {isBulkReturn ? "3. Evidencia fotográfica : *" : "4. Evidencia fotográfica : *"}
            </h4>
            <p className="gm-form-card-subtitle-white" style={{ fontFamily: '"Montserrat", sans-serif', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '30px' }}>
              {isBulkReturn ? "Sube una foto clara del pedido que recibiste" : "Sube una foto clara del producto para validar su estado."}
            </p>
            
            <div 
              className={`gm-premium-upload-zone-refined ${returnErrors.evidence ? 'error' : ''}`} 
              style={{ 
                minHeight: '280px', 
                border: returnFormData.evidence ? 'none' : '1px solid #FFC107', 
                borderRadius: '20px', 
                overflow: 'hidden', 
                cursor: returnFormData.evidence ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent'
              }}
              onClick={() => returnFormData.evidence && setPreviewImage(returnFormData.evidence)}
            >
              {returnFormData.evidence ? (
                <div style={{ padding: '0', display: 'inline-block' }}>
                  <img 
                    src={returnFormData.evidence} 
                    alt="Evidencia" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px', 
                      borderRadius: '15px', 
                      border: '2px solid #FFC107',
                      display: 'block' 
                    }} 
                  />
                </div>
              ) : (
                <label className="gm-upload-label-minimal" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleReturnImageUpload} 
                    style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}
                  />
                  <FaCamera style={{ fontSize: '2rem', marginBottom: '15px', color: '#FFC107' }} />
                  <span style={{ fontSize: '0.9rem', letterSpacing: '0.8px', color: '#fff', fontWeight: 400, opacity: 0.9 }}>SUBIR FOTO</span>
                </label>
              )}
            </div>
            
            {returnFormData.evidence && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setReturnFormData({...returnFormData, evidence: null}); }} 
                  className="gm-btn-change-photo"
                  style={{ 
                    background: 'transparent', 
                    border: '1px solid #FFC107', 
                    color: '#FFC107', 
                    padding: '8px 20px', 
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  CAMBIAR FOTO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ImageLightbox />
    </div>
  );
};

export default ReturnsSection;
