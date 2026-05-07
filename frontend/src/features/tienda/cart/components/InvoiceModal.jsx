/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';

// ✨ FACTURA MODAL MEJORADA — ESTRECHA, CON LOGO, IVA Y SCROLL
const InvoiceModal = ({ isOpen, onClose, invoiceData }) => {
  if (!isOpen || !invoiceData) return null;
  
  const {
    invoiceNumber = '',
    date = '',
    customerName = 'Consumidor Final',
    customerEmail = '',
    customerAddress = '',
    customerPhone = '',
    items = [],
    total = 0,
    subtotal = 0,
    shipping = ''
  } = invoiceData;

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Group items by name
    const groupedItems = (items || []).reduce((acc, i) => {
      const existing = acc.find(item => item.name === i.name);
      if (existing) {
        existing.quantity = (parseInt(existing.quantity) || 0) + (parseInt(i.quantity) || 0);
      } else {
        acc.push({ ...i });
      }
      return acc;
    }, []);

    // Standard white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Header - Left Name, Right Number
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Gorras medellín", 20, 25);
    
    doc.setFontSize(14);
    doc.text(`NUMERO PED: ${invoiceNumber || ''}`, 190, 25, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${date || ''}`, 190, 31, { align: 'right' });

    // Client Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Datos del cliente:", 20, 50);
    
    const phoneValue = customerPhone && customerPhone !== 'No especificado' ? customerPhone : 'No especificado';
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${customerName}`, 20, 57);
    doc.text(`Email: ${customerEmail}`, 20, 62);
    doc.text(`Dirección: ${customerAddress}`, 20, 67);
    doc.text(`Teléfono: ${phoneValue}`, 20, 72);
    doc.text(`Fecha: ${date || ''}`, 20, 77);
    doc.text(`Método de Pago: ${invoiceData.paymentMethod || 'N/A'}`, 20, 82);
    doc.text(`Envío: Consultar con el vendedor`, 20, 87);
    
    // TOTAL FRONT OF CLIENT DATA
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
    
    let yPosItems = tableTop + 14;
    doc.setTextColor(0, 0, 0);
    (items || []).forEach(item => {
      if (yPosItems > 260) { doc.addPage(); yPosItems = 20; }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(item.name.length > 35 ? item.name.substring(0, 35) + "..." : item.name, 20, yPosItems);
      doc.text(item.size || item.talla || 'N/A', 90, yPosItems);
      doc.text(String(item.quantity), 115, yPosItems);
      doc.text(`$${item.price.toLocaleString()}`, 145, yPosItems);
      doc.text(`$${(item.price * item.quantity).toLocaleString()}`, 175, yPosItems);
      
      yPosItems += 7;
    });

    // Pie de página
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

    doc.save(`Comprobante_GMCAPS_${invoiceNumber}.pdf`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      padding: '15px'
    }}>
      <div style={{
        background: '#0f172a',
        color: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        border: '1px solid #FFC107',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '10px', marginTop: '-5px' }}>
          <img
            src="/logo.png"
            alt="Logo GM CAPS"
            style={{
              width: '45px',
              height: '45px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/50x50/1E293B/FFC107?text=GM';
            }}
          />
          <h3 style={{
            color: '#FFC107',
            margin: '2px 0 0 0',
            fontSize: '15px',
            fontWeight: 'bold'
          }}>
            ¡Compra Exitosa!
          </h3>
        </div>

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: '#FFC107',
            fontSize: '18px',
            cursor: 'pointer',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 193, 7, 0.1)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <FaTimes />
        </button>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 193, 7, 0.2)',
          fontSize: '11px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#FFC107', marginBottom: '4px', fontSize: '12px' }}>DATOS DEL CLIENTE</div>
            <div><strong>Nombre:</strong> {customerName}</div>
            <div><strong>Dirección:</strong> {customerAddress}</div>
            <div><strong>Teléfono:</strong> {customerPhone}</div>
            <div><strong>Email:</strong> {customerEmail}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: '#FFC107', fontSize: '12px' }}>COMPROBANTE</div>
            <div>No. INV-{invoiceNumber}</div>
            <div>{date}</div>
          </div>
        </div>

        <div style={{
          marginBottom: '15px',
          padding: '4px 0',
          fontSize: '13px',
          textAlign: 'center',
          color: '#FFC107',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          GORRAS MEDELLÍN
        </div>

        {/* CUADRO SOLO PARA PRODUCTOS */}
        <div style={{
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          marginBottom: '10px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#FFC107' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 'bold' }}>Producto</th>
                <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 'bold' }}>Cant.</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255, 193, 7, 0.1)' }}>
                  <td style={{ padding: '7px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '7px 0' }}>
                    ${(item.price * item.quantity).toLocaleString()}
                    {item.quantity > 1 && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        c/u ${item.price.toLocaleString()}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALES FUERA DEL CUADRO */}
        <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '13px', padding: '0 5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', color: 'rgba(255,255,255,0.7)' }}>
            <span>Envío:</span>
            <strong style={{ fontStyle: 'italic' }}>{shipping || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '16px', color: '#FFC107', fontWeight: 'bold', borderTop: '1px solid rgba(255,193,7,0.2)', paddingTop: '10px' }}>
            <span>TOTAL:</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '22px' }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              flex: 1,
              padding: '9px',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📥 Descargar PDF
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '9px',
              backgroundColor: '#FFC107',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cerrar
          </button>
        </div>

        {/* Mensaje de envío */}
        <div style={{ margin: '16px 0 0 0', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ color: '#10B981', fontSize: '12px', fontWeight: '600', margin: '0', lineHeight: '1.5' }}>
            🚚 El costo del envío será asumido por el cliente y deberá pagarse directamente a la agencia de envío encargada del domicilio (Inter Rapidísimo, Envía, COONORTE o ZExpress).
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
