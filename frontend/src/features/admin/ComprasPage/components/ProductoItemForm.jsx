/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React, { useState, useRef, useEffect } from 'react';
import { FaTrash, FaSearch, FaTimes } from 'react-icons/fa';

const ProductoItemForm = ({ producto, index, availableProducts = [], availableSizes = [], onChange, onRemove, isViewMode = false, isFirst = false, errors = {}, isLoadingProducts = false }) => {
  const [showSelector, setShowSelector] = useState(false);
  const selectorRef = useRef(null);
  
  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setShowSelector(false);
      }
    };
    if (showSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSelector]);

  const totalCantidad = (producto.variantes || []).reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
  const subtotal = totalCantidad * (parseFloat(producto.precioCompra || 0));
  
  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const rounded = Math.floor(parseFloat(num));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const inputStyle = {
    backgroundColor: 'transparent',
    border: '1px solid #ffffff30',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '11px',
    padding: '2px 6px',
    width: '100%',
    height: '28px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: '#8F9DB1', // Azul vibrante
    marginBottom: '5px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const capStyle = { 
    fontSize: '10px', 
    color: '#8F9DB1', // Azul para etiquetas secundarias
    textTransform: 'uppercase', 
    letterSpacing: '0.4px', 
    marginBottom: '4px', // Ahora va arriba
    display: 'block',
    fontWeight: '700'
  };
  const readStyle = { backgroundColor: 'transparent', border: '1px solid #ffffff20', borderRadius: '4px', color: '#ffffff', fontSize: '11px', padding: '2px 6px', width: '100%', height: '28px', display: 'flex', alignItems: 'center', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  // ===== MODO VISTA: misma fila que registrar pero solo lectura =====
  if (isViewMode) {
    return (
      <div style={{ backgroundColor: 'transparent', padding: '8px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 95px 95px 85px 85px', gap: '6px', alignItems: 'start' }}>
          <div style={{ ...readStyle, border: 'none', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#F5C81B', height: '28px' }}>
            {index + 1}.
          </div>
          <div>
            <div style={{ ...readStyle, fontWeight: '600' }}>{producto.nombre || '-'}</div>
            {/* Variantes en modo vista */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {(producto.variantes || []).map((v, i) => (
                <div key={i} style={{ 
                  backgroundColor: 'transparent', 
                  border: '1px solid #334155', 
                  borderRadius: '4px', 
                  padding: '2px 6px', 
                  fontSize: '10px',
                  color: '#94a3b8'
                }}>
                  <span style={{ color: '#F5C81B', fontWeight: '700', textTransform: 'capitalize' }}>{v.talla?.toLowerCase()}</span> x {v.cantidad}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...readStyle, color: '#10B981', fontWeight: '700' }}>${formatNumber(producto.precioCompra)}</div>
          </div>
          <div>
            <div style={{ ...readStyle, color: '#F5C81B', fontWeight: '700' }}>${formatNumber(producto.precioVenta)}</div>
          </div>
          <div>
            <div style={{ ...readStyle, color: '#cbd5e1' }}>${formatNumber(producto.precioMayorista6)}</div>
          </div>
          <div>
            <div style={{ ...readStyle, color: '#cbd5e1' }}>${formatNumber(producto.precioMayorista80)}</div>
          </div>
        </div> {/* Cierre del grid de la línea 72 */}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>
              {producto.nombre ? `${producto.nombre} | ` : ''} 
              Total Cantidad: <span style={{ color: '#fff' }}>{totalCantidad}</span>
            </span>
            <div style={{ backgroundColor: 'rgba(245, 200, 27, 0.05)', border: '1px solid #F5C81B40', borderRadius: '4px', padding: '2px 8px' }}>
              <span style={{ fontSize: '10px', color: '#F5C81B', fontWeight: '800', marginRight: '6px' }}>SUBTOTAL:</span>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: '900' }}>${formatNumber(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'transparent',
      padding: '0px 4px 10px 4px',
      position: 'relative',
    }}>
      {/* FILA ÚNICA */}
      <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) 95px 95px 85px 85px 30px', gap: '6px', alignItems: 'start' }}>
        {/* Numeración */}
        <div style={{ ...readStyle, border: 'none', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#F5C81B', height: '28px', padding: 0 }}>
          {index + 1}.
        </div>

        {/* Columna Producto y Variantes */}
        <div style={{ position: 'relative', minWidth: 0 }} ref={selectorRef}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="text"
              value={producto.nombre || ''}
              onChange={(e) => {
                onChange(index, 'id', ''); // Marcar como nuevo
                onChange(index, 'nombre', e.target.value);
              }}
              placeholder="Escribir producto..."
              style={{ 
                ...inputStyle, 
                border: errors[`prod_${index}`] ? '1px solid #ef4444' : '1px solid #334155',
                flex: 1
              }}
            />
            <button 
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              title="Buscar en productos existentes"
              style={{
                backgroundColor: showSelector ? '#F5C81B' : 'transparent',
                border: '1px solid #F5C81B',
                borderRadius: '4px',
                color: showSelector ? '#000' : '#F5C81B',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: showSelector ? '0 0 10px rgba(245, 200, 27, 0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F5C81B';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 200, 27, 0.6)';
              }}
              onMouseLeave={(e) => {
                if (!showSelector) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#F5C81B';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <FaSearch size={13} />
            </button>
          </div>

          {/* SECCIÓN DE VARIANTES (TALLAS Y CANTIDADES) */}
          <div style={{ marginTop: '4px', paddingLeft: '4px', width: '100%', maxWidth: '100%', overflowX: 'auto', paddingBottom: '12px', display: 'block', boxSizing: 'border-box' }} className="yellow-scrollbar">
            <div style={{ display: 'inline-flex', flexWrap: 'nowrap', gap: '10px', alignItems: 'center', paddingRight: '150px', boxSizing: 'border-box' }}>
              {(producto.variantes || []).map((v, vi) => (
                <div key={v._tempKey || vi} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '2px',
                  backgroundColor: 'transparent',
                  padding: '2px 4px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  flexShrink: 0
                }}>
                  {/* Talla */}
                  <select
                    value={v.talla || ''}
                    onChange={(e) => {
                      const newVars = [...producto.variantes];
                      newVars[vi] = { ...newVars[vi], talla: e.target.value };
                      onChange(index, 'variantes', newVars);
                    }}
                    style={{ 
                      ...inputStyle, 
                      width: '85px', 
                      height: '28px', 
                      fontSize: '11px',
                      padding: '0 2px',
                      textTransform: 'capitalize',
                      border: errors[`talla_${index}_${vi}`] ? '1px solid #ef4444' : '1px solid #ffffff15'
                    }}
                  >
                    <option value="">Talla</option>
                    {availableSizes.map(s => {
                      const sizeValue = s.value || s;
                      const isSelectedByOther = producto.variantes.some((otherV, otherI) => otherI !== vi && otherV.talla === sizeValue);
                      return (
                        <option key={sizeValue} value={sizeValue} disabled={isSelectedByOther}>
                          {(() => {
                            const text = String(s.label || s).toLowerCase();
                            return text.charAt(0).toUpperCase() + text.slice(1);
                          })()}
                        </option>
                      );
                    })}
                  </select>
                  
                  {/* Control de Cantidad con Botones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1px', backgroundColor: '#ffffff05', borderRadius: '4px', padding: '0 2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const newVars = [...producto.variantes];
                        const newQty = Math.max(1, (parseInt(newVars[vi].cantidad) || 0) - 1);
                        newVars[vi] = { ...newVars[vi], cantidad: newQty };
                        onChange(index, 'variantes', newVars);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#F5C81B',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={v.cantidad || ''}
                      onChange={(e) => {
                        const newVars = [...producto.variantes];
                        newVars[vi] = { ...newVars[vi], cantidad: parseInt(e.target.value) || 0 };
                        onChange(index, 'variantes', newVars);
                      }}
                      style={{ 
                        ...inputStyle, 
                        width: '28px', 
                        height: '22px', 
                        fontSize: '10px', 
                        textAlign: 'center',
                        padding: '0',
                        backgroundColor: 'transparent',
                        border: 'none'
                      }}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVars = [...producto.variantes];
                        const newQty = (parseInt(newVars[vi].cantidad) || 0) + 1;
                        newVars[vi] = { ...newVars[vi], cantidad: newQty };
                        onChange(index, 'variantes', newVars);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#F5C81B',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Eliminar Variante */}
                  {(producto.variantes || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newVars = producto.variantes.filter((_, i) => i !== vi);
                        onChange(index, 'variantes', newVars);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6
                      }}
                    >
                      <FaTimes size={9} />
                    </button>
                  )}
                </div>
              ))}

              {/* Botón Añadir Variante - Limitado a 4 */}
              {(producto.variantes || []).length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const newVars = [...(producto.variantes || []), { talla: '', cantidad: 1, _tempKey: Math.random() }];
                    onChange(index, 'variantes', newVars);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px dashed #F5C81B50',
                    borderRadius: '4px',
                    color: '#F5C81B',
                    fontSize: '10px',
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.border = '1px dashed #F5C81B'}
                  onMouseLeave={(e) => e.currentTarget.style.border = '1px dashed #F5C81B50'}
                >
                  + Talla
                </button>
              )}
            </div>
          </div>

          {showSelector && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '280px', // Un poco más ancho que la columna para legibilidad
              backgroundColor: '#0c1220',
              border: '1px solid #F5C81B40',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
              zIndex: 100,
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto'
            }} className="yellow-scrollbar">
              {isLoadingProducts ? (
                <div style={{ padding: '10px', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>Cargando...</div>
              ) : availableProducts.length === 0 ? (
                <div style={{ padding: '10px', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>No hay productos</div>
              ) : (
                availableProducts
                  .filter(p => (p.nombre || p.Nombre || '').toLowerCase().includes((producto.nombre || '').toLowerCase()))
                  .map((p, i) => (
                  <div 
                    key={p.id || p.IdProducto || i}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #ffffff05',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => {
                      const selId = p.id || p.IdProducto;
                      const selNombre = p.nombre || p.Nombre;
                      const selTalla = p.talla || p.Talla || '';
                      
                      onChange(index, 'id', selId);
                      onChange(index, 'nombre', selNombre);
                      
                      // ⚡ RESETEAR VARIANTES: Si el producto tiene talla, usarla; si no, dejar vacío
                      onChange(index, 'variantes', [{ talla: selTalla, cantidad: 1, _tempKey: Date.now() }]);
                      
                      onChange(index, 'precioCompra', (p.precioCompra || p.PrecioCompra) > 0 ? (p.precioCompra || p.PrecioCompra) : '');
                      onChange(index, 'precioVenta', (p.precioVenta || p.PrecioVenta) > 0 ? (p.precioVenta || p.PrecioVenta) : '');
                      onChange(index, 'precioMayorista6', (p.precioMayorista6 || p.PrecioMayorista6) > 0 ? (p.precioMayorista6 || p.PrecioMayorista6) : '');
                      onChange(index, 'precioMayorista80', (p.precioMayorista80 || p.PrecioMayorista80) > 0 ? (p.precioMayorista80 || p.PrecioMayorista80) : '');
                      
                      setShowSelector(false);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff08'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <img 
                      src={(Array.isArray(p.imagenes) && p.imagenes[0]) || (Array.isArray(p.Imagenes) && p.Imagenes[0]) || '/images/placeholder-product.png'} 
                      alt={p.nombre || p.Nombre} 
                      style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = '/images/placeholder-product.png'; }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{p.nombre || p.Nombre}</span>
                      {p.talla && <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'capitalize' }}>Talla: {p.talla.toLowerCase()}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {/* Precio Compra */}
        <input
          type="text"
          value={formatNumber(producto.precioCompra)}
          onChange={(e) => {
            let val = e.target.value.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            onChange(index, 'precioCompra', val);
          }}
          style={{ ...inputStyle, color: '#10B981', fontWeight: '700', border: errors[`price_${index}`] ? '1px solid #ef4444' : '1px solid #334155' }}
          placeholder="0"
        />
        {/* Precio Venta */}
        <input
          type="text"
          value={formatNumber(producto.precioVenta)}
          onChange={(e) => {
            let val = e.target.value.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            onChange(index, 'precioVenta', val);
          }}
          style={{ ...inputStyle, color: '#F5C81B', fontWeight: '700', border: errors[`sell_${index}`] ? '1px solid #ef4444' : '1px solid #334155' }}
          placeholder="0"
        />
        {/* Precio +6 */}
        <input
          type="text"
          value={formatNumber(producto.precioMayorista6)}
          onChange={(e) => {
            let val = e.target.value.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            onChange(index, 'precioMayorista6', val);
          }}
          style={inputStyle}
          placeholder="0"
        />
        {/* Precio +80 */}
        <input
          type="text"
          value={formatNumber(producto.precioMayorista80)}
          onChange={(e) => {
            let val = e.target.value.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            onChange(index, 'precioMayorista80', val);
          }}
          style={inputStyle}
          placeholder="0"
        />
        {/* Eliminar / Limpiar */}
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0px' }}>
          <button
            type="button"
            onClick={() => onRemove(index)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px',
              height: '28px',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isFirst && producto.id === '' ? "Limpiar fila" : "Eliminar fila"}
          >
            <FaTrash size={13} />
          </button>
        </div>
      </div>

      {/* Estilos locales para corregir el dropdown nativo */}
      <style>{`
        select option {
          background-color: #0c1220;
          color: #ffffff;
        }
        /* Eliminar flecha por defecto en algunos navegadores si es necesario o asegurar consistencia */
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff' %3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 4px center;
          background-size: 10px;
          padding-right: 20px !important;
        }
      `}</style>
    </div>
  );

};

export default ProductoItemForm;
