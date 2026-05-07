/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaTimes, FaSearchPlus, FaArrowLeft, FaArrowRight, FaPlus, FaCheckCircle } from 'react-icons/fa';

export const PAYMENT_METHODS = [
  { id: 'nequi', name: 'Nequi', img: 'https://res.cloudinary.com/dxc5qqsjd/image/upload/v1773077199/WhatsApp_Image_2026-03-05_at_2.23.11_PM_4_ez06y3.jpg', group: 'upfront', qr: 'https://res.cloudinary.com/dxc5qqsjd/image/upload/v1773337920/WhatsApp_Image_2026-03-12_at_12.49.25_PM_vryssw.jpg' },
  { id: 'bancolombia', name: 'Bancolombia', img: 'https://res.cloudinary.com/dxc5qqsjd/image/upload/v1773079418/WhatsApp_Image_2026-03-09_at_1.01.39_PM_lgtfn2.jpg', group: 'upfront', qr: 'https://res.cloudinary.com/dxc5qqsjd/image/upload/v1773337951/bancolombia_u4ipqc.jpg' },
  { id: 'bold', name: 'Bold', img: 'https://res.cloudinary.com/dxc5qqsjd/image/upload/v1773077199/WhatsApp_Image_2026-03-05_at_2.23.11_PM_2_bjynti.jpg', group: 'upfront', link: 'https://checkout.bold.co/payment/LNK_UT9BG4IVNG' }
];

// ✨ CHECKOUT MODAL (FLUJO EN 2 PASOS)
const CheckoutModal = ({ isOpen, onClose, onConfirm, total, subtotal, selectedMethod, setSelectedMethod, deliveryType, setDeliveryType, address, setAddress, phone, setPhone, receiptFile, setReceiptFile, isProcessing, cartItems = [], getProductName: gPN, getProductPrice: gPP, user = {} }) => {
  const [step, setStep] = React.useState(1);
  const [addressError, setAddressError] = React.useState('');
  const [phoneError, setPhoneError] = React.useState('');
  const [isQrExpanded, setIsQrExpanded] = React.useState(false);
  const [isReceiptExpanded, setIsReceiptExpanded] = React.useState(false);
  const [internalStepPage, setInternalStepPage] = React.useState(0); // Para paginar productos en el resumen final
  
  // BLOQUEAR SCROLL DEL FONDO
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);
  
  // Reset step when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      // Eliminamos el setAddress inicial aquí para que dependa exclusivamente 
      // del padre (useCartPage) que sí hace el fetch completo a la API de perfil.
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const upfrontMethods = PAYMENT_METHODS.filter(m => m.group === 'upfront');
  const otherMethods = PAYMENT_METHODS.filter(m => m.group !== 'upfront');
  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const isUpfront = currentMethod?.group === 'upfront';
  const isPickup = deliveryType === 'recoger';
  const isDelivery = deliveryType === 'envio';
  const isContraentrega = selectedMethod === 'contraentrega';
  const isNequi = selectedMethod === 'nequi';
  const isBancolombia = selectedMethod === 'bancolombia';
  const isBold = selectedMethod === 'bold';

  const shippingText = isPickup ? 'recoger en el local' : (isUpfront ? 'no incluido' : 'contraentrega');

  const handleContinue = () => {
    setAddressError('');
    setPhoneError('');

    if (!selectedMethod) return;

    if (isDelivery) {
      const addr = (address || '').trim();
      const keywords = ['calle', 'cl ', 'cra', 'carrera', 'diagonal', 'dg ', 'avenida', 'av ', 'circular', 'transversal', 'tv ', 'nro', '#', 'numero', 'casa', 'apto', 'bloque'];
      const isAddrValid = keywords.some(k => addr.toLowerCase().includes(k)) && addr.length > 5;

      if (!addr) {
        setAddressError('La dirección es obligatoria');
        return;
      } else if (!isAddrValid) {
        setAddressError('Ingrese una dirección válida (Ej: Calle 123 # 45-67)');
        return;
      }
    }

    const phoneClean = (phone || '').toString().trim();
    if (!phoneClean) {
      setPhoneError('El teléfono es obligatorio');
      return;
    } else if (phoneClean.length < 7 || /\D/.test(phoneClean)) {
      setPhoneError('Ingrese un número de teléfono válido (solo números)');
      return;
    }

    // Si es Bold, abrir enlace en nueva pestaña
    if (isBold) {
      window.open(currentMethod.link, '_blank');
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '15px' }}>
      <div style={{ 
        background: '#0f172a', 
        color: 'white', 
        borderRadius: '14px', 
        width: '100%', 
        maxWidth: '550px', // Aumentado ligeramente para que quepa el diseño side-by-side
        border: '1px solid rgba(255,193,7,0.5)', 
        padding: '10px 20px 20px 20px', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 20px rgba(255,193,7,0.05)',
        marginTop: '-20px' // Subirlo un poco
      }}>
        {/* Header decorativo superior */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, transparent, #FFC107, transparent)', opacity: 0.8 }} />
        
        <button onClick={handleClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFC107', fontSize: '16px', cursor: 'pointer', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, transition: 'all 0.2s' }}>
          <FaTimes />
        </button>

        {/* ========== PASO 1: SELECCIONAR MÉTODO ========== */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,193,7,0.1)', paddingBottom: '8px' }}>
               <h3 style={{ color: '#FFC107', textAlign: 'center', fontSize: '17px', margin: '0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Finalizar Pedido</h3>
               <p style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center', margin: '2px 0 0 0' }}>Completa los datos para procesar tu compra</p>
            </div>

            {/* Selector de Entrega */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>¿Cómo quieres recibir tu pedido?</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button onClick={() => setDeliveryType('envio')} style={{ flex: 1, padding: '10px 8px', background: deliveryType === 'envio' ? 'rgba(255,193,7,0.15)' : '#1e293b', border: deliveryType === 'envio' ? '2px solid #FFC107' : '1px solid #334155', borderRadius: '10px', color: deliveryType === 'envio' ? '#FFC107' : '#94a3b8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>🚚 Envío a domicilio</button>
                <button onClick={() => { setDeliveryType('recoger'); setAddressError(false); }} style={{ flex: 1, padding: '10px 8px', background: deliveryType === 'recoger' ? 'rgba(255,193,7,0.15)' : '#1e293b', border: deliveryType === 'recoger' ? '2px solid #FFC107' : '1px solid #334155', borderRadius: '10px', color: deliveryType === 'recoger' ? '#FFC107' : '#94a3b8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>🏪 Recoger en local</button>
              </div>
            </div>

            {/* Métodos principales centrados */}
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Métodos de pago</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '8px' }}>
                {upfrontMethods.map(m => (
                  <button key={m.id} onClick={() => { setSelectedMethod(m.id); setAddressError(false); }} style={{ background: selectedMethod === m.id ? 'rgba(255,193,7,0.15)' : '#1e293b', border: selectedMethod === m.id ? '2px solid #FFC107' : '1px solid #334155', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                    <img src={m.img} alt={m.name} style={{ height: '28px', borderRadius: '6px', objectFit: 'contain' }} />
                    <span style={{ color: selectedMethod === m.id ? '#FFC107' : '#94a3b8', fontSize: '12px', fontWeight: '600' }}>{m.name}</span>
                  </button>
                ))}
              </div>

              {/* Mensaje de envío visible en verde */}
               {selectedMethod && isUpfront && !isPickup && (
                <div style={{ margin: '6px 0', padding: '6px 10px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ color: '#10B981', fontSize: '11px', fontWeight: '600', margin: 0, lineHeight: '1.3' }}>
                    📦 Usted asumirá el costo del envío de su pedido.
                  </p>
                </div>
              )}
            </div>

            {/* Dirección y Teléfono */}
            {selectedMethod && (
              <div style={{ display: 'flex', flexDirection: isDelivery ? 'row' : 'column', gap: '8px', marginBottom: '10px' }}>
                {isDelivery && (
                  <div style={{ flex: 1.2 }}>
                    <label style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                      Dirección: <span style={{ color: '#ff4d4d' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => { setAddress(e.target.value); setAddressError(''); }} 
                      placeholder={'Ej: Calle 123 # 45-67'} 
                      style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1E293B', border: addressError ? '1px solid #ff4d4d' : '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                    />
                    {addressError && <p style={{ color: '#ff4d4d', fontSize: '9px', margin: '3px 0 0 0' }}>{addressError}</p>}
                  </div>
                )}
                
                <div style={{ flex: 0.8 }}>
                  <label style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Teléfono: <span style={{ color: '#ff4d4d' }}>*</span>
                  </label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => { 
                      const val = e.target.value.replace(/\D/g, ''); 
                      setPhone(val); 
                      setPhoneError(''); 
                    }} 
                    placeholder={'Ej: 312...'} 
                    style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1E293B', border: phoneError ? '1px solid #ff4d4d' : '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                  />
                  {phoneError && <p style={{ color: '#ff4d4d', fontSize: '9px', margin: '3px 0 0 0' }}>{phoneError}</p>}
                </div>
              </div>
            )}

            {/* Resumen */}
            <div style={{ backgroundColor: 'rgba(255,193,7,0.05)', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#ccc' }}>Subtotal:</span>
                <span style={{ color: '#fff' }}>${subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#ccc' }}>Envío:</span>
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{shippingText || 'selecciona método'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,193,7,0.2)', fontSize: '14px' }}>
                <strong style={{ color: '#FFC107' }}>Total:</strong>
                <strong style={{ color: '#FFC107' }}>${total.toLocaleString()}</strong>
              </div>
            </div>

            {/* Botones Paso 1 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClose} style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid #666', borderRadius: '8px', color: '#CBD5E1', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={handleContinue} disabled={!selectedMethod} style={{ flex: 1, padding: '8px', backgroundColor: !selectedMethod ? '#555' : '#FFC107', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: !selectedMethod ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                Continuar
              </button>
            </div>
          </>
        )}

        {/* ========== PASO 2: QR / COMPROBANTE ========== */}
        {step === 2 && (
          <>
            <h3 style={{ color: '#FFC107', textAlign: 'center', fontSize: '16px', margin: '0 0 8px 0' }}>
              {isBold ? 'Paga con Bold' : (isNequi || isBancolombia) ? `Paga con ${currentMethod?.name}` : 'Confirma tu pedido'}
            </h3>

            {/* CONTENEDOR QR Y COMPROBANTE (Side-by-Side) */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'row', alignItems: 'stretch', marginBottom: '15px' }}>
              
              {/* QR (IZQUIERDA - va primero) */}
              {(isNequi || isBancolombia) && (
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', backgroundColor: 'rgba(255,193,7,0.03)', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Paga con {isNequi ? 'Nequi' : 'Bancolombia'}</p>
                  <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', alignSelf: 'center' }} onClick={() => setIsQrExpanded(true)}>
                    <img src={currentMethod.qr} alt="QR" style={{ width: '130px', height: '130px', objectFit: 'contain', display: 'block', borderRadius: '8px' }} />
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', padding: '6px', borderRadius: '50%', color: '#FFC107', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaSearchPlus size={14} /> 
                    </div>
                  </div>
                </div>
              )}

              {/* COMPROBANTE DE PAGO (DERECHA - va después) */}
              {isUpfront && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Comprobante de Pago <span style={{ color: '#ff4d4d' }}>*</span></label>
                  
                  <div style={{ 
                    flex: 0.6,
                    border: !receiptFile ? '2px dashed #334155' : '2px solid #10B981', 
                    borderRadius: '12px', 
                    padding: receiptFile ? '0' : '12px', 
                    backgroundColor: receiptFile ? '#000' : 'rgba(30, 41, 59, 0.5)',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    minHeight: '140px'
                  }}>
                    {/* Input oculto solo cuando NO hay imagen */}
                    {!receiptFile && (
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReceiptFile(e.target.files[0]);
                          }
                        }} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} 
                      />
                    )}
                    
                    {!receiptFile ? (
                      <div style={{ width: '100%' }}>
                        <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 10px 0' }}>Haz clic o arrastra la imagen</p>
                        <button style={{ padding: '6px 12px', background: 'rgba(255,193,7,0.1)', border: '1px solid #FFC107', color: '#FFC107', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' }}>Subir archivo</button>
                      </div>
                    ) : (
                      <>
                        {/* Botón X para eliminar imagen */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptFile(null);
                          }}
                          style={{ 
                            position: 'absolute', 
                            top: '6px', 
                            right: '6px', 
                            background: '#ff4d4d', 
                            border: 'none', 
                            color: 'white', 
                            borderRadius: '50%', 
                            width: '22px', 
                            height: '22px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer', 
                            zIndex: 20,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                          }}
                        >
                          <FaTimes size={10} />
                        </button>

                        {/* Imagen llena todo el cuadro y abre zoom al hacer clic */}
                        <img 
                          src={URL.createObjectURL(receiptFile)} 
                          alt="Comprobante" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsReceiptExpanded(true);
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0, cursor: 'zoom-in' }} 
                        />

                        {/* Lupa de zoom en la esquina */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsReceiptExpanded(true);
                          }}
                          style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', padding: '5px', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.3)', zIndex: 15, cursor: 'pointer' }}
                        >
                          <FaSearchPlus size={12} /> 
                        </div>

                        {/* Badge de éxito en la parte inferior */}
                        <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.8)', padding: '3px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 15 }}>
                          <FaCheckCircle size={10} style={{ color: '#10B981' }} />
                          <span style={{ color: '#10B981', fontSize: '9px', fontWeight: 'bold' }}>Subido</span>
                        </div>
                      </>
                    )}
                  </div>
                  {!receiptFile && <p style={{ color: '#ff4d4d', fontSize: '10px', margin: '6px 0 0 4px', fontWeight: 'bold' }}>⚠️ Es obligatorio</p>}
                </div>
              )}
            </div>

            {/* Modal de QR Ampliado */}
            {isQrExpanded && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10002, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsQrExpanded(false)}>
                <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>
                    <FaTimes />
                  </button>
                  <img src={currentMethod.qr} alt="QR Ampliado" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', border: '2px solid #FFC107' }} />
                  <p style={{ color: '#FFC107', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>Código QR de Pago</p>
                </div>
              </div>
            )}

            {/* Modal de Comprobante Ampliado */}
            {isReceiptExpanded && receiptFile && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10002, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsReceiptExpanded(false)}>
                <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>
                    <FaTimes />
                  </button>
                  <img src={URL.createObjectURL(receiptFile)} alt="Comprobante Ampliado" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', border: '2px solid #10B981' }} />
                  <p style={{ color: '#10B981', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>Comprobante de Pago</p>
                </div>
              </div>
            )}

            {/* Bold redirigido */}
            {isBold && (
              <div style={{ textAlign: 'center', margin: '0 0 16px 0', padding: '16px', backgroundColor: 'rgba(255,193,7,0.05)', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.2)' }}>
                <p style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '8px' }}>Se ha abierto la pasarela de Bold en una nueva pestaña.</p>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>Completa tu pago allí y luego sube el comprobante aquí.</p>
                <a href={currentMethod.link} target="_blank" rel="noopener noreferrer" style={{ color: '#FFC107', fontWeight: 'bold', fontSize: '12px' }}>Abrir Bold nuevamente →</a>
              </div>
            )}

            {/* Mensaje para recoger / envio (contraentrega) */}
            {(isContraentrega || isPickup) && (
              <div style={{ textAlign: 'center', margin: '0 0 16px 0', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <p style={{ color: '#10B981', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                  {isPickup ? '🏪 Podrás recoger tu pedido en nuestro local y pagarlo al instante si así lo elegiste.' : '🚚 Pagarás al recibir tu pedido en la dirección indicada.'}
                </p>
              </div>
            )}

            {/* Contenedor Side-by-Side para Resumen */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* Lista de productos del pedido (IZQUIERDA) */}
              <div style={{ flex: 1.1, minWidth: '220px', backgroundColor: 'rgba(255,193,7,0.04)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,193,7,0.1)', marginBottom: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 8px 0' }}>
                  <p style={{ color: '#FFC107', fontSize: '11px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 Tu pedido:</p>
                  {/* Flechitas de paginación interna */}
                  {cartItems.length > 4 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setInternalStepPage(p => Math.max(0, p - 1))}
                        disabled={internalStepPage === 0}
                        style={{ background: 'transparent', border: 'none', color: internalStepPage === 0 ? '#444' : '#FFC107', cursor: 'pointer', padding: 0 }}
                      >
                        <FaArrowLeft size={10} />
                      </button>
                      <button 
                        onClick={() => setInternalStepPage(p => Math.min(Math.ceil(cartItems.length / 4) - 1, p + 1))}
                        disabled={internalStepPage >= Math.ceil(cartItems.length / 4) - 1}
                        style={{ background: 'transparent', border: 'none', color: internalStepPage >= Math.ceil(cartItems.length / 4) - 1 ? '#444' : '#FFC107', cursor: 'pointer', padding: 0 }}
                      >
                        <FaArrowRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
                
                {cartItems.slice(internalStepPage * 4, (internalStepPage + 1) * 4).map((item, i) => {
                  const pPrice = gPP ? gPP(item) : (item.precio || 0);
                  const qty = item.quantity || 1;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,193,7,0.05)' }}>
                      <span style={{ color: '#CBD5E1', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {gPN ? gPN(item) : (item.nombre || 'Prod')} x{qty}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: '#FFC107', fontWeight: 'bold', whiteSpace: 'nowrap' }}>${(pPrice * qty).toLocaleString()}</span>
                        {qty > 1 && (
                          <span style={{ color: '#94a3b8', fontSize: '9px', marginTop: '1px' }}>${pPrice.toLocaleString()} c/u</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen final (DERECHA) */}
              <div style={{ flex: 1, minWidth: '220px', backgroundColor: 'rgba(255,193,7,0.04)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,193,7,0.1)', marginBottom: '8px', fontSize: '11px' }}>
                <p style={{ color: '#FFC107', fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Información:</p>
                
                {/* Filas al frente (side-by-side) */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block' }}>Método:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentMethod?.name}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block' }}>Envío:</span>
                    <span style={{ color: '#FFC107', fontWeight: 'bold', fontStyle: 'italic' }}>{shippingText}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block' }}>Entrega a:</span>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>{address || 'Recogida en local'}</span>
                  <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '8px' }}>| Tel: {phone || 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,193,7,0.2)', fontSize: '14px' }}>
                  <strong style={{ color: '#FFC107' }}>Total:</strong>
                  <strong style={{ color: '#FFC107' }}>${total.toLocaleString()}</strong>
                </div>
              </div>

            </div>

            {/* Botones Paso 2 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleBack} style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid #666', borderRadius: '8px', color: '#CBD5E1', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>← Volver</button>
              <button onClick={onConfirm} disabled={isProcessing || (isUpfront && !receiptFile)} style={{ flex: 1, padding: '8px', backgroundColor: (isProcessing || (isUpfront && !receiptFile)) ? '#555' : '#FFC107', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: (isProcessing || (isUpfront && !receiptFile)) ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isProcessing ? 0.7 : 1 }}>
                {isProcessing ? 'Procesando...' : 'Confirmar Compra'}
              </button>
            </div>

          </>
        )}
      </div>
      
    </div>
  );
};

export default CheckoutModal;
