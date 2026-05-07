/* === PÁGINA PRINCIPAL === 
   Este componente es la interfaz visual principal de la ruta. 
   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */

// src/modules/purchases/pages/ComprasPage.jsx
import '../style/index.css';
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { useLocation } from 'react-router-dom';
import { 
  Alert, EntityTable, SearchInput, CustomPagination, 
  StatusPill, DateInputWithCalendar 
} from '../../../shared/services';
import StatusFilter from '../components/StatusFilter';
import ProductoItemForm from '../components/ProductoItemForm';
import { 
  FaArrowLeft, 
  FaPlus, 
  FaTrash, 
  FaSave, 
  FaEye, 
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaTruck,
  FaMoneyBillWave,
  FaShoppingCart,
  FaSearch,
  FaFilePdf
} from 'react-icons/fa';
import { useComprasLogic } from '../hooks/useComprasLogic';

const ComprasPage = () => {
  const location = useLocation();
  const [detalleSearch, setDetalleSearch] = useState('');
  const {
    modoVista, searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterDate, setFilterDate,
    currentPage, setCurrentPage, itemsPerPage, alert, setAlert, errors,
    compraViendo, compraEditando, completarModal, setCompletarModal,
    annulModal, setAnnulModal, handleAnularCompra,
    nuevaCompra, setNuevaCompra, availableStatuses, availablePaymentMethods, availableSizes,
    proveedoresActivos, mostrarLista, mostrarFormulario, mostrarDetalle,
    agregarProducto, actualizarProducto, eliminarProducto, calcularTotal,
    handleSubmit, handleCompletarCompra, confirmCompletarCompra,
    filtered, loading, actionLoading, actionLoadingText, availableProducts, isLoadingProducts
  } = useComprasLogic(location);

  const columns = [
    { header: 'N° Factura', field: 'numeroRecibo', width: '160px',  render: (item) => <span style={{ fontWeight: '600' }}>{item.numeroRecibo || item.numCompra || '-'}</span> },
    { header: 'Proveedor',field: 'proveedor', width: '200px', render: (item) => <span style={{ fontWeight: '600' }}>{item.proveedor}</span> },
    { header: 'Fecha',    field: 'fecha',     width: '100px', render: (item) => <span>{item.fecha}</span> },
    { header: 'Total',    field: 'total',     width: '120px', render: (item) => <span style={{ color: '#10B981', fontWeight: '700', fontSize: '14px' }}>${Number(item.total).toLocaleString('es-CO')}</span> },
    { header: 'Estado',   field: 'estado',    width: '110px', render: (item) => <StatusPill status={item.estado} /> }
  ];

  const productosVisibles = (modoVista === "detalle" 
    ? compraViendo?.productos || [] 
    : nuevaCompra.productos);

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const exportCompraToPDF = (compra) => {
    if (!compra) return;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('es-CO');
    
    // Header - Black rectangle
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("GORRAS MEDELLÍN", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let currentY = 28;
    if (compra.numCompra) {
      doc.text(`COMPROBANTE DE COMPRA N° ${compra.numCompra}`, 105, currentY, { align: 'center' });
      currentY += 10;
    } else {
      currentY += 5;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMACIÓN DE LA COMPRA", 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.text("Proveedor:", 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(toTitleCase(String(compra.proveedor || '-')), 50, currentY);
    currentY += 7;

    if (compra.numeroRecibo && compra.numeroRecibo !== '-') {
      doc.setFont('helvetica', 'bold');
      doc.text("N° Factura:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(String(compra.numeroRecibo), 50, currentY);
      currentY += 7;
    }

    if (compra.metodo && compra.metodo !== '-') {
      doc.setFont('helvetica', 'bold');
      doc.text("Método Pago:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(String(compra.metodo), 50, currentY);
      currentY += 7;
    }

    if (compra.fecha && compra.fecha !== '-') {
      doc.setFont('helvetica', 'bold');
      doc.text("Fecha Compra:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(String(compra.fecha), 50, currentY);
      currentY += 7;
    }

    if (compra.fechaRegistro && compra.fechaRegistro !== '-') {
      doc.setFont('helvetica', 'bold');
      doc.text("Fecha Registro:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(String(compra.fechaRegistro), 50, currentY);
      currentY += 7;
    }

    let y = currentY + 10;
    doc.setFillColor(200, 200, 200); // Light gray for header row
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text("Producto", 20, y + 5);
    doc.text("Talla", 90, y + 5);
    doc.text("Cant.", 145, y + 5);
    doc.text("Subtotal", 170, y + 5);

    y += 15;
    doc.setFont('helvetica', 'normal');
    
    // Group products by name and size to avoid exact duplicates
    const mergedProducts = (compra.productos || []).reduce((acc, p) => {
        const existing = acc.find(item => item.nombre === p.nombre && item.talla === p.talla);
        if (existing) {
            existing.cantidad += (parseInt(p.cantidad) || 0);
        } else {
            acc.push({
                nombre: p.nombre,
                talla: p.talla,
                cantidad: parseInt(p.cantidad) || 0,
                precioCompra: p.precioCompra
            });
        }
        return acc;
    }, []).sort((a, b) => a.nombre.localeCompare(b.nombre));

    let lastProductName = null;
    mergedProducts.forEach(p => {
      if (y > 260) { 
        doc.addPage(); 
        y = 20; 
        lastProductName = null;
      }
      
      if (p.nombre !== lastProductName) {
        doc.setFont('helvetica', 'bold');
        doc.text(toTitleCase(String(p.nombre || '').substring(0, 32)), 20, y);
        lastProductName = p.nombre;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(String(p.talla), 90, y);
      doc.text(String(p.cantidad || 0), 145, y);
      const subtotal = (parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 0);
      doc.text(`$${Number(subtotal).toLocaleString('es-CO')}`, 170, y);
      
      y += 8;
    });

    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.line(15, y, 195, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL FACTURA:", 100, y);
    doc.text(`$${Number(compra.total || 0).toLocaleString('es-CO')}`, 170, y);

    const pageHeight = doc.internal.pageSize.height;
    // Footer - Light gray line above
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

    doc.save(`Compra_${compra.numCompra || compra.id}_GMCAPS.pdf`);
  };

  return (
    <>
      {alert.show && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ show: false, message: '', type: 'success' })}
        />
      )}
      


      {/* MODAL DE CONFIRMACIÓN DE COMPLETAR */}
      {completarModal.isOpen && (
        <div className="gm-zoom-overlay-admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#000', border: '1px solid #334155', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', marginBottom: '12px' }}>Confirmar Registro</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              ¿Estás seguro de que deseas completar el registro de la compra <strong>#{completarModal.compra?.numCompra}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setCompletarModal({ isOpen: false, compra: null })}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #334155', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmCompletarCompra}
                style={{ padding: '10px 20px', background: '#F5C81B', border: 'none', color: '#000', fontWeight: '800', borderRadius: '8px', cursor: 'pointer' }}
              >
                {actionLoading ? 'Completando...' : 'Completar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ANULAR */}
      {annulModal.isOpen && (
        <div className="gm-zoom-overlay-admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#000', border: '1px solid #ef4444', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ color: '#ef4444', fontSize: '18px', fontWeight: '800', marginBottom: '12px' }}>Anular Compra</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              ¿Estás seguro de que deseas anular la compra <strong>#{annulModal.compra?.numCompra}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setAnnulModal({ isOpen: false, compra: null })}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #334155', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAnularCompra}
                style={{ padding: '10px 20px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: '800', borderRadius: '8px', cursor: 'pointer' }}
              >
                {actionLoading ? 'Anulando...' : 'Anular'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="compras-container">
        <div className="compras-header">
          <div className="compras-header-top">
            <div className="compras-header-left">
              {modoVista !== "lista" && (
                <button onClick={mostrarLista} className="compras-btn-back">
                  <FaArrowLeft size={16} />
                </button>
              )}
              <div>
                <h1 className="compras-title">
                  {modoVista === "formulario" && (compraEditando ? "Editar Compra" : "Registrar Compra")}
                  {modoVista === "detalle" && "Detalle de Compra"}
                  {modoVista === "lista" && "Compras"}
                </h1>
                <p className="compras-subtitle">Gestiona y haz seguimiento de tus órdenes</p>
              </div>
            </div>

              {modoVista === "detalle" && (
                <button 
                  onClick={() => exportCompraToPDF(compraViendo)} 
                  className="compras-btn-pdf"
                  style={{
                    backgroundColor: '#000000',
                    color: '#fff',
                    border: '1px solid #161E2D',
                    borderRadius: '8px',
                    padding: '0 15px',
                    height: '40px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaFilePdf size={14} /> Descargar PDF
                </button>
              )}
              {modoVista === "lista" && (
                <button onClick={() => mostrarFormulario()} className="compras-btn-register">
                  Registrar Compra
                </button>
              )}
              {modoVista === "formulario" && (
                <button 
                  onClick={handleSubmit} 
                  className={`compras-btn-submit ${actionLoading ? 'loading' : ''}`}
                  disabled={actionLoading}
                >
                {actionLoading ? actionLoadingText : (compraEditando ? 'Actualizar Compra' : 'Registrar Compra')}
                </button>
              )}
            </div>
          

          {modoVista === "lista" && (
            <div className="compras-search-bar" style={{ display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '0px' }}>
              <div style={{ flex: 1, marginRight: '8px' }}>
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar proveedor..."
                  onClear={() => setSearchTerm('')}
                  fullWidth={true}
                />
              </div>
              <div className="compras-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <StatusFilter 
                  filterStatus={filterStatus} 
                  onFilterSelect={setFilterStatus} 
                  statuses={availableStatuses}
                />
              </div>
            </div>
          )}
        </div>

        {modoVista === "lista" ? (
          <div className="compras-main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ flex: '0 0 auto' }}>
              <EntityTable
                entities={filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                columns={columns}
                onView={mostrarDetalle}
                onComplete={handleCompletarCompra}
                onAnular={v => setAnnulModal({ isOpen: true, compra: v })}
                moduleType="compras"
                loading={loading}
                className="compras-entity-table"
              />
            </div>

            <CustomPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / itemsPerPage) || 1}
              onPageChange={setCurrentPage}
              totalItems={filtered.length}
              showingStart={filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              endIndex={Math.min(currentPage * itemsPerPage, filtered.length)}
              itemsName="compras"
            />
          </div>
        ) : modoVista === "formulario" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingBottom: '100px' }}>
            <div className="compras-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* PANEL IZQUIERDO: Datos Generales */}
              <div style={{
                backgroundColor: '#000000',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaTruck size={14} color="#F5C81B" /> Datos del proveedor
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Proveedor: <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      value={nuevaCompra.proveedor}
                      onChange={(e) => {
                        const pvr = proveedoresActivos.find(p => p.nombre === e.target.value);
                        setNuevaCompra(p => ({ ...p, proveedor: e.target.value, idProveedor: pvr?.id || '' }));
                      }}
                      style={{
                        backgroundColor: '#000000',
                        border: errors?.proveedor ? '1px solid #ef4444' : '1px solid #334155',
                        borderRadius: '6px',
                        color: '#fff',
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Seleccionar proveedor activo...</option>
                      {proveedoresActivos.map(p => (
                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                     <div>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>N° Factura: <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          placeholder={`Nº ${nuevaCompra.nextFacturaPlaceholder || '10001'}`}
                          value={nuevaCompra.numeroFactura || ''}
                          onChange={(e) => setNuevaCompra(p => ({ ...p, numeroFactura: e.target.value }))}
                          style={{
                            width: '100%',
                            backgroundColor: '#000',
                            border: errors?.numeroFactura ? '1px solid #ef4444' : '1px solid #334155',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                     </div>
                     <div>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Método de pago:</label>
                        <select
                          value={nuevaCompra.metodoPago}
                          onChange={(e) => setNuevaCompra(p => ({ ...p, metodoPago: e.target.value }))}
                          style={{
                            backgroundColor: '#000000',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#fff',
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        >
                          {availablePaymentMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                     </div>
                  </div>
                </div>
              </div>

              {/* PANEL DERECHO: Resumen de Totales */}
              <div style={{
                backgroundColor: '#000',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaFileInvoiceDollar size={14} color="#F5C81B" /> Resumen de compra
                </h3>

                <div style={{ backgroundColor: '#00000050', padding: '15px', borderRadius: '8px', border: '1px solid #2d3748' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8F9DB1', fontWeight: '700' }}>Total factura:</span>
                      <span style={{ color: '#10B981', fontWeight: '800', fontSize: '20px' }}>${calcularTotal().toLocaleString('es-CO')}</span>
                   </div>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Fecha de compra:</label>
                        <DateInputWithCalendar
                          value={nuevaCompra.fecha}
                          onChange={(d) => setNuevaCompra(p => ({ ...p, fecha: d }))}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Fecha de registro:</label>
                        <DateInputWithCalendar
                          value={nuevaCompra.fechaRegistro}
                          onChange={(d) => setNuevaCompra(p => ({ ...p, fechaRegistro: d }))}
                        />
                    </div>
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#000000',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <FaShoppingCart size={14} color="#F5C81B" /> <span style={{ color: '#8F9DB1', fontWeight: '800' }}>Productos adquiridos</span>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <FaSearch size={11} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Buscar en productos..."
                      value={detalleSearch}
                      onChange={(e) => setDetalleSearch(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#000', border: '1px solid #334155', borderRadius: '6px', color: '#fff', padding: '6px 10px 6px 30px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={agregarProducto}
                    className="btn-primary"
                    style={{ height: '34px' }}
                  >
                    + Añadir Producto
                  </button>
                </div>
              </div>

              <div>
                <div style={{ 
                   display: 'grid', 
                   gridTemplateColumns: '22px minmax(0, 1fr) 95px 95px 85px 85px 30px', 
                   gap: '6px', 
                   padding: '0 4px 0px 4px', 
                   marginBottom: '1px'
                 }}>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}></span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>Producto / Tallas</span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>P. Compra</span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>P. Venta</span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>May 6</span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>May 80</span>
                   <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}></span>
                 </div>
                {nuevaCompra.productos
                  .map((p, originalIdx) => ({ ...p, originalIdx })) // Guardar índice original
                  .filter(p => {
                    if (!detalleSearch) return true;
                    return (p.nombre || '').toLowerCase().includes(detalleSearch.toLowerCase());
                  })
                  .map((prod) => (
                    <ProductoItemForm
                      key={prod._tempKey || prod.originalIdx}
                      index={prod.originalIdx}
                      producto={prod}
                      isFirst={prod.originalIdx === 0}
                      onRemove={() => eliminarProducto(prod.originalIdx)}
                      onChange={(i, campo, valor) => actualizarProducto(i, campo, valor)}
                      errors={errors}
                      availableProducts={availableProducts}
                      availableSizes={availableSizes}
                      isLoadingProducts={isLoadingProducts}
                    />
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* MODO VISTA: DETALLE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
               <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaTruck size={14} color="#F5C81B" /> Información general
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Proveedor:</label>
                      <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '6px', color: '#8F9DB1', padding: '8px 12px', fontSize: '13px', fontWeight: '800' }}>
                        {compraViendo?.proveedor || '-'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Método de pago:</label>
                        <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '6px', color: '#8F9DB1', padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                          <FaMoneyBillWave size={12} color="#8F9DB1" /> {compraViendo?.metodo || '-'}
                        </div>
                      </div>
                      {compraViendo?.numeroRecibo && compraViendo.numeroRecibo !== '-' && (
                      <div>
                        <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>N° Factura:</label>
                        <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#8F9DB1', fontWeight: '800' }}>
                          {compraViendo?.numeroRecibo || '-'}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
               </div>

               <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaFileInvoiceDollar size={14} color="#F5C81B" /> Resumen de compra
                  </h3>
                  
                  <div style={{ backgroundColor: '#00000050', padding: '15px', borderRadius: '8px', border: '1px solid #2d3748' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#8F9DB1', fontWeight: '700' }}>Total factura:</span>
                       <span style={{ color: '#10B981', fontWeight: '800', fontSize: '20px' }}>
                         ${Number(compraViendo?.total || 0).toLocaleString('es-CO')}
                       </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Fecha de compra:</label>
                      <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '6px', color: '#8F9DB1', padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                        <FaCalendarAlt size={12} color="#8F9DB1" /> {compraViendo?.fecha || '-'}
                      </div>
                    </div>
                    {compraViendo?.fechaRegistro && compraViendo.fechaRegistro !== '-' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#8F9DB1', marginBottom: '8px', display: 'block', fontWeight: '800' }}>Fecha de registro:</label>
                      <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '6px', color: '#8F9DB1', padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                        <FaCalendarAlt size={12} color="#8F9DB1" /> {compraViendo?.fechaRegistro || '-'}
                      </div>
                    </div>
                    )}
                  </div>
               </div>
            </div>

            <div style={{ backgroundColor: '#000000', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <FaShoppingCart size={14} color="#F5C81B" /> <span style={{ color: '#8F9DB1', fontWeight: '800' }}>Productos detallados</span>
                 </h3>
                 <div style={{ position: 'relative', width: '220px' }}>
                   <FaSearch size={11} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                   <input
                     type="text"
                     placeholder="Buscar producto..."
                     value={detalleSearch}
                     onChange={(e) => setDetalleSearch(e.target.value)}
                     style={{ width: '100%', backgroundColor: '#000', border: '1px solid #334155', borderRadius: '6px', color: '#fff', padding: '6px 10px 6px 30px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                   />
                 </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '22px 1fr 95px 95px 85px 85px', 
                    gap: '6px', 
                    padding: '0 4px 0px 4px', 
                    marginBottom: '1px'
                  }}>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}></span>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>Producto / Tallas</span>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>P. Compra</span>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>P. Venta</span>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>Mayor. 6</span>
                    <span style={{ fontSize: '10px', color: '#8F9DB1', fontWeight: '800' }}>Mayor. 80</span>
                  </div>
                  {(compraViendo?.productos || []).filter(p => {
                    if (!detalleSearch) return true;
                    return (p.nombre || '').toLowerCase().includes(detalleSearch.toLowerCase());
                  }).map((p, i) => (
                    <ProductoItemForm key={i} index={i} producto={p} isViewMode={true} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
};

export default ComprasPage;