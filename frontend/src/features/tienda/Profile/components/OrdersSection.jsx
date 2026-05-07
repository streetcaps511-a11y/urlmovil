/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { 
  FaShoppingBag, FaSearch, FaTimes, FaChevronLeft, 
  FaChevronRight, FaArrowLeft, FaExchangeAlt, FaDownload, FaUndo, FaEye
} from "react-icons/fa";
import jsPDF from 'jspdf';
import { RotateCcw } from 'lucide-react';
import '../styles/OrdersSection.css';

const OrdersSection = ({ 
  orderView, setOrderView, orderStatus, setOrderStatus, 
  orderQuery, setOrderQuery, paginatedOrders, ordersPage, setOrdersPage,
  totalOrderPages, selectedOrder, setSelectedOrder, 
  openImage, handleReturnClick, setActiveTab, allReturns = [],
  user = {}, formData = {}, handleBulkReturnClick, isBulkReturn,
  setSelectedReturn, setReturnView // Añadidos para el modal de motivo
}) => {
  // ✅ Hooks SIEMPRE arriba, antes de cualquier return
  const [showReasonModal, setShowReasonModal] = React.useState(false);
  const [detailProdsPage, setDetailProdsPage] = React.useState(1);
  const PRODS_PER_PAGE = 3;

  React.useEffect(() => {
    setDetailProdsPage(1);
  }, [selectedOrder?.id]);

  const StatusBadge = ({ status, color }) => (
    <div className="gm-status-badge" style={{ backgroundColor: `${color}20`, color: color, border: `1px solid ${color}40` }}>
      <span className="gm-status-point" style={{ backgroundColor: color }} />
      {status}
    </div>
  );

  if (orderView === 'list') {
    return (
      <div className="gm-orders-section">
        <div className="gm-orders-header">
          <div className="gm-section-header">
            <div className="gm-section-title-wrapper">
              <FaShoppingBag color="#FFC107" size={20} />
              <h3 className="gm-section-title">Mis Pedidos</h3>
            </div>
          </div>
          
          <div className="gm-filter-bar">
            <div className="gm-status-filters">
              {[
                { label: 'Todos', color: '#3b82f6' },
                { label: 'Pendiente', color: '#FFC107' },
                { label: 'Completada', color: '#10b981' },
                { label: 'Rechazado', color: '#ef4444' }
              ].map(s => (
                <button 
                  key={s.label} 
                  onClick={() => setOrderStatus(s.label)} 
                  className={`gm-status-filter-btn ${orderStatus === s.label ? 'active' : ''}`}
                  style={{ 
                    '--active-color': s.color,
                    '--hover-color': s.color
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="gm-search-wrapper">
              <FaSearch className="gm-search-icon" size={14} />
              <input 
                value={orderQuery} 
                onChange={(e) => setOrderQuery(e.target.value)} 
                placeholder="Buscar pedido..." 
                className="gm-search-input"
              />
              {orderQuery && (
                <FaTimes 
                  onClick={() => setOrderQuery("")} 
                  className="gm-clear-icon"
                  size={12} 
                />
              )}
            </div>
          </div>
        </div>

        <div className="gm-orders-list">
          {paginatedOrders.length > 0 ? (
            <>
              {paginatedOrders.map(o => (
                <div key={o.id} onClick={() => { setSelectedOrder(o); setOrderView('detail'); }} className="gm-order-card">
                  <div className="gm-order-main-info">
                    <FaShoppingBag color="#FFC107" size={16} />
                    <div className="gm-order-id">{o.id}</div>
                  </div>
                  <div className="gm-order-meta">
                    <div className="gm-order-total">{o.total}</div>
                    <div className="gm-order-date">{o.date.toUpperCase()}</div>
                    <StatusBadge 
                      status={(String(o.status).toUpperCase() === 'ANULADO' || String(o.status).toUpperCase() === 'ANULADA') ? 'RECHAZADO' : o.status} 
                      color={o.statusColor} 
                    />
                  </div>
                </div>
              ))}
              
              {totalOrderPages > 1 && (
                <div className="gm-pagination">
                  <button 
                    onClick={() => setOrdersPage(p => Math.max(1, p - 1))} 
                    disabled={ordersPage === 1}
                    className="gm-pagination-btn"
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  {[...Array(totalOrderPages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setOrdersPage(i + 1)} 
                      className={`gm-page-num-btn ${ordersPage === i + 1 ? 'active' : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))} 
                    disabled={ordersPage === totalOrderPages}
                    className="gm-pagination-btn"
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>No se encontraron pedidos.</div>
          )}
        </div>
      </div>
    );
  }

  // DETALLE DEL PEDIDO
  const totalProdsPages = Math.ceil((selectedOrder?.items?.length || 0) / PRODS_PER_PAGE);
  const paginatedItems = (selectedOrder?.items || []).slice(
    (detailProdsPage - 1) * PRODS_PER_PAGE, 
    detailProdsPage * PRODS_PER_PAGE
  );

  const hasExistingReturn = allReturns?.some(r => {
     const rawOrderId = String(r.orderId || r.rawOrderId || '').replace('PED-', '');
     const currentOrderId = String(selectedOrder.id || '').replace('PED-', '');
     return rawOrderId === currentOrderId;
  });

  const customerName = formData?.name || user?.Nombre || user?.nombreCompleto || user?.name || user?.nombre || 'Consumidor Final';
  const customerEmail = formData?.email || user?.Correo || user?.email || user?.Email || '';
  const customerAddress = selectedOrder?.address || formData?.address || user?.Direccion || user?.direccion || user?.Dirección || '';
  
  const getCleanPhone = () => {
    const p1 = selectedOrder?.phone;
    const p2 = formData?.phone;
    const p3 = user?.Telefono || user?.telefono || user?.Teléfono || user?.phone || user?.celular;
    const p4 = formData?.Telefono || formData?.telefono;

    const val = p2 || p1 || p3 || p4 || "";
    if (!val || val === "No especificado" || val === "null" || val === "undefined") {
        return "No especificado";
    }
    return val;
  };
  const customerPhone = getCleanPhone();

  const handleDownloadPDF = () => {
    if (!selectedOrder) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const invoiceNumber = selectedOrder.id.replace('PED-', '');
    const date = selectedOrder.date;
    
    // Group items by name to avoid repeating name for multiple sizes
    const groupedItems = (selectedOrder.items || []).reduce((acc, i) => {
      const price = typeof i.price === 'string' ? parseInt(i.price.replace(/[^0-9]/g, '')) : i.price;
      const existing = acc.find(item => item.name === i.name);
      if (existing) {
        existing.quantity = (parseInt(existing.quantity) || 0) + (parseInt(i.qty) || 0);
        // We assume items might have sizes in a separate property if available
      } else {
        acc.push({
          name: i.name,
          quantity: parseInt(i.qty) || 0,
          price: price
        });
      }
      return acc;
    }, []);

    const total = typeof selectedOrder.total === 'string' ? parseInt(selectedOrder.total.replace(/[^0-9]/g, '')) : selectedOrder.total;
    const shippingNote = 'Consultar con el vendedor';



    // Header - Left aligned Name, Right aligned Number
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Gorras medellín", 20, 25);
    
    doc.setFontSize(14);
    doc.text(`NUMERO PED: ${invoiceNumber}`, 190, 25, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${date}`, 190, 31, { align: 'right' });

    const customerDocument = formData?.documentNumber || user?.Documento || user?.numeroDocumento || user?.numero_documento || 'N/A';

    // Customer Data (Left)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Datos del cliente:", 20, 50);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    
    const drawLine = (label, value, x, y) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, y);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), x + labelWidth, y);
    };

    drawLine("Nombre: ", customerName, 20, 57);
    drawLine("Documento: ", customerDocument, 20, 62);
    drawLine("Email: ", customerEmail, 20, 67);
    drawLine("Teléfono: ", customerPhone, 20, 72);
    drawLine("Dirección: ", customerAddress, 20, 77);
    drawLine("Método de Pago: ", selectedOrder.paymentMethod || 'N/A', 20, 82);
    drawLine("Envío: ", shippingNote, 20, 87);

    // TOTAL FRONT OF CUSTOMER DATA (Right side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Total del pedido:", 190, 70, { align: 'right' });
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0); // Negro solicitado
    doc.text(`$${total.toLocaleString()}`, 190, 82, { align: 'right' });

    // Table Header - Black background
    const tableTop = 100;
    doc.setFillColor(0, 0, 0); 
    doc.rect(15, tableTop, 180, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Producto", 20, tableTop + 5.5);
    doc.text("Talla", 90, tableTop + 5.5);
    doc.text("Cantidad", 115, tableTop + 5.5);
    doc.text("Precio", 145, tableTop + 5.5);
    doc.text("Total", 175, tableTop + 5.5);

    // Table Rows
    let yPosItems = tableTop + 14;
    doc.setTextColor(0, 0, 0);
    (selectedOrder.items || []).forEach(item => {
      if (yPosItems > 260) {
        doc.addPage();
        yPosItems = 20;
      }
      
      const price = typeof item.price === 'string' ? parseInt(item.price.replace(/[^0-9]/g, '')) : item.price;
      const qty = parseInt(item.qty) || 0;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(item.name.length > 35 ? item.name.substring(0, 35) + "..." : item.name, 20, yPosItems);
      doc.text(item.size || 'N/A', 90, yPosItems);
      doc.text(String(qty), 115, yPosItems);
      doc.text(`$${price.toLocaleString()}`, 145, yPosItems);
      doc.text(`$${(price * qty).toLocaleString()}`, 175, yPosItems);
      yPosItems += 7;
    });

    // FOOTER CORPORATIVO
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 25, 195, pageHeight - 25);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("GORRAS MEDELLÍN - Tu estilo, nuestra pasión", 105, pageHeight - 18, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Alfonzo López - Medellin | WhatsApp: +57 300 6158180", 105, pageHeight - 13, { align: 'center' });
    doc.text("Email: duvann1991@gmail.com | Instagram: @gorrasmedellin", 105, pageHeight - 8, { align: 'center' });

    doc.save(`Pedido_GMCAPS_${invoiceNumber}.pdf`);
  };

  return (
    <div className="gm-order-detail">
      <div className="gm-detail-top-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setOrderView('list')} className="gm-back-btn-circle" title="Volver"><FaArrowLeft /></button>
          <h3 className="gm-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Pedido {selectedOrder.id}</h3>
        </div>
        
        <div className="gm-header-right-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={handleDownloadPDF} 
            className="gm-download-btn-premium"
            style={{
              padding: '6px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              transition: 'all 0.2s ease'
            }}
          >
            <FaDownload /> PDF
          </button>
            <StatusBadge 
              status={(String(selectedOrder.status).toUpperCase() === 'ANULADO' || String(selectedOrder.status).toUpperCase() === 'ANULADA') ? 'RECHAZADO' : selectedOrder.status} 
              color={selectedOrder.statusColor} 
            />
            {/* Ver Motivo para Rechazados/Anulados */}
            {(String(selectedOrder.status || '').toLowerCase().includes('rechaz') || String(selectedOrder.status || '').toLowerCase().includes('anulad')) && selectedOrder.rejectionReason && (
              <button 
                onClick={() => setShowReasonModal(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  height: '36px'
                }}
              >
                <FaEye size={12} /> Ver motivo
              </button>
            )}
          </div>
          
          {/* Botón Devolver Pedido */}
          {(String(selectedOrder.status).toUpperCase() === 'COMPLETADA' || selectedOrder.status === 'Entregado') && !hasExistingReturn && (
            <button 
              onClick={() => handleBulkReturnClick(selectedOrder)}
              style={{
                marginTop: '15px',
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 0,
                padding: '6px 16px',
                fontSize: '0.75rem',
                height: '32px',
                backgroundColor: 'transparent',
                borderColor: '#ef4444',
                border: '1px solid #ef4444',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: 'none'
              }}
            >
              <RotateCcw size={12} />
              Devolver todo el pedido
            </button>
          )}
        </div>
      </div>

      <div className="gm-detail-content">
        <div className="gm-detail-products-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h4 className="gm-detail-block-title" style={{ fontSize: '1rem', color: '#fff', fontWeight: 400, margin: 0, textTransform: 'none', fontFamily: '"Montserrat", sans-serif', letterSpacing: '0.5px' }}>Productos del pedido</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
          </div>

          {paginatedItems.map(i => (
            <div key={i.id} className="gm-order-temu-item ultra-slim-row" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '5px 20px', marginBottom: '10px', overflow: 'hidden' }}>
              <div 
                className="gm-product-img-wrapper" 
                style={{ position: 'relative', width: '60px', height: '60px', minWidth: '60px', cursor: 'pointer' }}
                onClick={() => openImage(i.image)}
              >
                <img 
                  src={i.image} 
                  className="gm-order-item-img" 
                  alt={i.name} 
                  style={{ width: '100%', height: '100%', background: '#000' }} 
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.5rem', textAlign: 'center', padding: '2px 0' }}>Ver más</div>
              </div>
              
              <div className="gm-item-ultra-horizontal-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '25px', flex: 1 }}>
                  <span className="gm-item-name" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '400', whiteSpace: 'nowrap', fontFamily: '"Montserrat", sans-serif' }}>
                    {i.name.charAt(0).toUpperCase() + i.name.slice(1).toLowerCase()}
                  </span>
                  
                  <div className="gm-item-spec-info" style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: '"Outfit", sans-serif' }}>
                    Talla: {i.size} <span style={{ margin: '0 10px', opacity: 0.15, color: 'rgba(255,255,255,0.3)' }}>|</span> Cantidad: {i.qty}
                  </div>
                </div>

                <div className="gm-item-action-price-group" style={{ display: 'flex', alignItems: 'center', gap: '25px', paddingRight: '5px' }}>
                  <span className="gm-item-price" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#4ADE80', minWidth: '90px', textAlign: 'right', fontFamily: '"Outfit", sans-serif' }}>
                    ${( (typeof i.price === 'string' ? parseInt(i.price.replace(/[^0-9]/g, '')) : i.price) * (parseInt(i.qty) || 1) ).toLocaleString('es-CO')}
                  </span>
                  {(selectedOrder.status === "Aprobado" || selectedOrder.status === "Completada") && (
                    !allReturns.some(r => 
                      Number(r.rawOrderId) === Number(selectedOrder.id.replace('PED-', '')) && 
                      Number(r.productId) === Number(i.id)
                    )
                  ) && (
                    <button 
                      onClick={() => { handleReturnClick(i, selectedOrder); setActiveTab('returns'); }} 
                      className="gm-item-change-btn"
                      style={{ margin: 0, padding: '4px 12px', fontSize: '0.6rem', textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                      Solicitar cambio
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gm-detail-top-info-grid">
        <div className="gm-summary-info-box">
          <div className="gm-summary-field">
            <label className="gm-info-label-premium">Medio de pago:</label>
            <div className="gm-info-value-premium">{selectedOrder.paymentMethod}</div>
          </div>
          <div className="gm-summary-field">
            <label className="gm-info-label-premium">Fecha del pedido:</label>
            <div className="gm-info-value-premium">{selectedOrder.date}</div>
          </div>
          <div className="gm-summary-field">
            <label className="gm-info-label-premium">Dirección de entrega:</label>
            <div className="gm-info-value-premium">{selectedOrder.address}</div>
          </div>

          {selectedOrder.monto1 > 0 && (
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">1ra Consignación:</label>
              <div className="gm-info-value-premium" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                ${Number(selectedOrder.monto1).toLocaleString('es-CO')}
              </div>
            </div>
          )}

          {selectedOrder.monto2 > 0 && (
            <div className="gm-summary-field">
              <label className="gm-info-label-premium">2da Consignación:</label>
              <div className="gm-info-value-premium" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                ${Number(selectedOrder.monto2).toLocaleString('es-CO')}
              </div>
            </div>
          )}

          <div className="gm-summary-field">
            <label className="gm-info-label-premium">Total del pedido:</label>
            <div className="gm-info-value-premium total">{selectedOrder.total}</div>
          </div>
        </div>

        <div className="gm-summary-receipt-box">
          <label className="gm-info-label-premium">Comprobante(s):</label>

          {(selectedOrder.status === 'Pago Incompleto' || (selectedOrder.monto1 > 0 && selectedOrder.monto2 === 0)) && (
             <div className="gm-partial-balance-banner-client">
                FALTAN ${(parseInt(selectedOrder.total.replace(/[^0-9]/g, '')) - (selectedOrder.monto1 || 0)).toLocaleString('es-CO')}
             </div>
          )}

          <div className={`gm-receipt-container-premium ${selectedOrder.receipt2 ? 'multiple' : ''}`}>
            {selectedOrder.receipt ? (
              <div onClick={() => openImage(selectedOrder.receipt)} className="gm-receipt-wrapper-premium">
                <img src={selectedOrder.receipt} alt="Comprobante 1" className="gm-receipt-img-premium" />
                <div className="gm-receipt-overlay-premium">{selectedOrder.receipt2 ? 'Pago 1' : 'Ver más'}</div>
              </div>
            ) : null}

            {selectedOrder.receipt2 ? (
              <div onClick={() => openImage(selectedOrder.receipt2)} className="gm-receipt-wrapper-premium">
                <img src={selectedOrder.receipt2} alt="Comprobante 2" className="gm-receipt-img-premium" />
                <div className="gm-receipt-overlay-premium">Pago 2</div>
              </div>
            ) : null}

            {!selectedOrder.receipt && !selectedOrder.receipt2 && (
              <div className="gm-no-receipt-box-premium">Sin comprobante disponible</div>
            )}
          </div>
        </div>
      </div>

      {showReasonModal && (
        <div className="gm-reason-modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="gm-reason-modal-content" onClick={e => e.stopPropagation()}>
            <div className="gm-reason-modal-header">
              <h3>Motivo del Rechazo</h3>
              <button className="gm-close-reason-modal" onClick={() => setShowReasonModal(false)}>×</button>
            </div>
            <div className="gm-reason-modal-body">
              <p>{selectedOrder.rejectionReason}</p>
            </div>

          </div>
        </div>
      )}


    </div>
  );
};

export default OrdersSection;
