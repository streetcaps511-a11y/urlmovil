/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaTimes, FaMinus, FaPlus, FaShoppingCart, FaBan, FaShareAlt, FaCheck, FaWhatsapp, FaFacebook, FaTwitter, FaLink, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../styles/ProductModal.css';

// Helper: determina si un color es "claro" para usar texto oscuro
const isLightColor = (colorName) => {
  const lightColors = ['white', 'blanco', 'yellow', 'amarillo', 'beige', 'crema', 'cream', 'ivory', 'marfil', 'oro', 'gold', 'dorado', 'lime', 'cyan', 'aqua', 'silver', 'plata', 'celeste', 'lila', 'hueso', 'rosa', 'pink'];
  return lightColors.includes(colorName.toLowerCase());
};

// Helper: mapea nombre de color a hex para background
const colorNameToHex = (name) => {
  const map = {
    'azul marino': '#000080',
    negro: '#000000', black: '#000000',
    blanco: '#ffffff', white: '#ffffff',
    rojo: '#ff0000', red: '#ff0000',
    azul: '#0000ff', blue: '#0000ff',
    verde: '#008000', green: '#008000',
    amarillo: '#ffff00', yellow: '#ffff00',
    morado: '#800080', purple: '#800080',
    gris: '#808080', gray: '#808080', grey: '#808080',
    naranja: '#ffa500', orange: '#ffa500',
    rosa: '#ffc0cb', pink: '#ffc0cb',
    cafe: '#6f4e37', café: '#6f4e37', brown: '#6f4e37', marrón: '#6f4e37',
    beige: '#f5f5dc',
    crema: '#fffdd0',
    celeste: '#87ceeb',
    lila: '#e6e6fa',
    hueso: '#f5f5dc',
    dorado: '#d4ac0d', gold: '#d4ac0d',
    plata: '#c0c0c0', silver: '#c0c0c0',
    negro_alt: '#777777', // Color alternativo para visibilidad
  };
  return map[name.toLowerCase()] || name.toLowerCase();
};

const ProductModal = ({
  product,
  closeModal,
  inventory,
  selectedSize,
  handleSizeSelect,
  quantity,
  incrementQuantity,
  decrementQuantity,
  handleModalAddToCart,
  showSizeError,
  handleQuantityInput,
  safeImg,
  normalizeSizes = (p) => {
    const t = p?.tallas;
    if (!t) return [];
    if (Array.isArray(t)) return t.filter(Boolean).map(x => String(x).trim()).filter(Boolean);
    if (typeof t === 'string') return t.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }
}) => {
    const [copied, setCopied] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);

    const handleShare = (e) => {
    if (e) e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/productos?producto=${product.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowShareMenu(false);
    }, 2000);
  };

  const shareSocial = (platform) => {
    const url = `${window.location.origin}/productos?producto=${product.id}`;
    const text = `¡Mira esta gorra en Gorras Medellín!: ${product.nombre}`;
    let shareUrl = '';
    if (platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    setShowShareMenu(false);
  };

const [modalImgIndex, setModalImgIndex] = React.useState(0);

    const nextImage = (e) => {
    e.stopPropagation();
    setModalImgIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e) => {
    e.stopPropagation();
    setModalImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

React.useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [product]);

  if (!product) return null;
  const images = Array.isArray(product.imagenes) && product.imagenes.filter(Boolean).length
    ? product.imagenes.filter(Boolean).map(x => String(x).trim()).filter(Boolean)
    : [safeImg(product)];

  const sizes = normalizeSizes(product);

  // Stock logic
  const getAvailableFor = (inv, productId, size) => {
    if (inv) {
      const pid = String(productId);
      return Math.max(0, Number(inv?.[pid]?.[size] ?? 0));
    }
    if (!product.tallasStock) return 0;
    try {
      const stockObj = typeof product.tallasStock === 'string'
        ? JSON.parse(product.tallasStock)
        : product.tallasStock;
      
      if (Array.isArray(stockObj)) {
        const found = stockObj.find(item => String(item.talla || '').toLowerCase() === String(size).toLowerCase());
        return found ? Number(found.cantidad || 0) : 0;
      }
      return Number(stockObj[size] ?? 0);
    } catch {
      return 0;
    }
  };

  const remaining = selectedSize ? getAvailableFor(inventory, product.id, selectedSize) : 0;

  const getStockColor = (count) => {
    if (count >= 20) return '#10b981';
    if (count >= 10) return '#f59e0b';
    return '#ef4444';
  };

  const isAgotado = Number(product.stock) === 0;
  const isOffer = (product.hasDiscount || product.has_discount || product.oferta) && product.precioOferta;

  const getWholesalePrice = (qty, prod) => {
    const q = parseInt(qty) || 0;
    if (q >= 80 && parseFloat(prod.precioMayorista80) > 0) return prod.precioMayorista80;
    if (q >= 6 && parseFloat(prod.precioMayorista6) > 0) return prod.precioMayorista6;
    return isOffer ? prod.precioOferta : prod.precio;
  };

  const currentPrice = getWholesalePrice(quantity, product);

  return (
    <div className="gm-modal-overlay">
      <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
        <div 
          className={`gm-share-btn ${showShareMenu ? 'active' : ''}`} 
          onClick={handleShare}
          title="Compartir producto"
          style={{ cursor: 'pointer' }}
        >
          <FaShareAlt style={{ color: "#F5C81B" }} />
          {showShareMenu && (
            <div className="gm-share-popover" onClick={e => e.stopPropagation()}>
              <div className="gm-share-header">Compartir en</div>
              <div className="gm-share-options">
                <button className="gm-share-option whatsapp" onClick={() => shareSocial('whatsapp')} data-tooltip="WhatsApp">
                  <FaWhatsapp />
                </button>
                <button className="gm-share-option facebook" onClick={() => shareSocial('facebook')} data-tooltip="Facebook">
                  <FaFacebook />
                </button>
                <button className="gm-share-option twitter" onClick={() => shareSocial('twitter')} data-tooltip="Twitter">
                  <FaTwitter />
                </button>
                <button className="gm-share-option copy" onClick={copyToClipboard} data-tooltip="Copiar enlace">
                  {copied ? <FaCheck /> : <FaLink />}
                </button>
              </div>
              <div className="gm-share-footer">
                {copied ? '¡Copiado!' : 'Copiar enlace'}
              </div>
            </div>
          )}
        </div>
        <button className="gm-modal-close" onClick={closeModal} type="button">
          <FaTimes size={18} />
        </button>

        {/* LEFT: IMAGE */}
        <div className="gm-modal-left">
          <div className="gm-modal-imgbox">
            {isAgotado && <div className="gm-img-badge-corner agotado">AGOTADO</div>}
            {isOffer && <div className="gm-img-badge-corner oferta">OFERTA</div>}
            <img src={images[modalImgIndex]} alt={product.nombre} className="gm-modal-img" />
            {images.length > 1 && (
              <>
                <button className="gm-modal-arrow prev" onClick={prevImage} type="button">
                  <FaChevronLeft />
                </button>
                <button className="gm-modal-arrow next" onClick={nextImage} type="button">
                  <FaChevronRight />
                </button>
              </>
            )}
            {images.length > 1 && (
              <div className="gm-modal-dots">
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={`gm-modal-dot ${i === modalImgIndex ? 'active' : ''}`}
                    onMouseEnter={() => setModalImgIndex(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: INFO */}
        <div className="gm-modal-right">
          <div className="gm-modal-right-content">
            {/* 1. Category + Title + Color Chips */}
            <div className="gm-modal-title-colors" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 className="gm-modal-title" style={{ margin: 0 }}>{product.nombre}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {product.colores && product.colores.filter(Boolean).length > 0 && (
                  <div className="gm-modal-colors-inline" style={{ marginTop: 0 }}>
                    {product.colores.filter(Boolean).map((c, idx) => {
                      const hex = colorNameToHex(c);
                      const swatchBg = (c.toLowerCase() === 'negro' || hex === '#000000') ? '#000' : hex;
                      return (
                        <span key={idx} className="gm-color-chip">
                          <span
                            className="gm-color-chip-swatch"
                            style={{
                              backgroundColor: swatchBg,
                              borderColor: swatchBg === '#000' ? '#FFF' : 'rgba(255,255,255,0.15)'
                            }}
                          />
                          {c}
                        </span>
                      );
                    })}
                  </div>
                )}
                {(product.categoria || product.Categoria || product.category) && (
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: 'rgba(255,193,7,0.12)',
                    color: '#FFC107',
                    border: '1px solid rgba(255,193,7,0.35)',
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase'
                  }}>
                    🏷 {product.categoria || product.Categoria || product.category}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Price Row */}
            <div className="gm-price-row">
              <div className="gm-modal-price-container">
                <div className="gm-modal-price-main">
                  ${Math.round(currentPrice || 0).toLocaleString('es-CO')}
                </div>
                {isOffer && (
                  <div className="gm-original-price-row">
                    <span className="gm-original-price">
                       Antes: ${Math.round(product.precio).toLocaleString('es-CO')}
                    </span>
                    <span className="gm-discount-badge">
                      {Math.round(((product.precio - product.precioOferta) / product.precio) * 100)}% DCTO
                    </span>
                  </div>
                )}
              </div>
              <div className="gm-modal-tags-inline">
                {parseInt(quantity) >= 80 && parseFloat(product.precioMayorista80) > 0 ? (
                  <span className="gm-tag gm-tag--destacado" style={{ backgroundColor: '#10b981', color: '#fff' }}>Mayorista 80+</span>
                ) : parseInt(quantity) >= 6 && parseFloat(product.precioMayorista6) > 0 ? (
                  <span className="gm-tag gm-tag--featured" style={{ backgroundColor: '#2a4a6f', color: '#fff' }}>Mayorista 6+</span>
                ) : null}
              </div>
            </div>

            {/* 3. Bulk Info */}
            <div className="gm-bulk-info-box">
              <span className="gm-bulk-info-text">A partir de 6 unidades tienes descuento por mayor</span>
            </div>

            {/* 4. Description */}
            <div className="gm-modal-desc-box">
              <p className="gm-modal-description">
                {product.descripcion || "Sin descripción disponible."}
              </p>
            </div>

            {/* 5. Sizes */}
            {sizes.length > 0 && (
              <div className="gm-sizes">
                <div className="gm-sizes-head">
                  <span className="gm-sizes-label">Talla:</span>
                </div>
                <div className="gm-sizes-wrap">
                  {sizes.map((t) => {
                  const ava = getAvailableFor(inventory, product.id, t);
                  const isOutOfStock = Number(product.stock) === 0;
                  const disabled = ava <= 0 || isOutOfStock;
                  const isSelected = selectedSize === t;
                  return (
                    <div key={t} className="gm-size-chip-container">
                      {!disabled && <div className="gm-size-tooltip">disponible: {ava}</div>}
                      {disabled && <div className="gm-size-tooltip">{isOutOfStock ? "agotado" : "talla agotada"}</div>}
                      <button
                        type="button"
                        className={`gm-size-chip ${disabled ? "is-disabled" : ""} ${isSelected ? "is-selected" : ""}`}
                        onClick={() => !disabled && handleSizeSelect(t)}
                      >
                        {t}
                      </button>
                    </div>
                  );
                })}
                </div>
                {showSizeError && (
                  <div className="gm-size-error-msg">⚠️ Debes seleccionar una talla primero</div>
                )}
              </div>
            )}

            {/* 6. Quantity + Stock */}
            <div className="gm-quantity-selector">
              <div className="gm-quantity-label">Cantidad:</div>
              <div className="gm-quantity-row">
                <div className="gm-quantity-controls">
                  <button className="gm-qty-btn" onClick={decrementQuantity} disabled={Number(product.stock) === 0 || parseInt(quantity) <= 0} type="button">
                    <FaMinus size={10} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="gm-qty-input-manual"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleQuantityInput(val);
                    }}
                    disabled={Number(product.stock) === 0}
                    onFocus={(e) => setTimeout(() => e.target.select(), 10)}
                  />
                  <button className="gm-qty-btn" onClick={incrementQuantity} disabled={Number(product.stock) === 0 || (selectedSize && parseInt(quantity) >= remaining)} type="button">
                    <FaPlus size={10} />
                  </button>
                </div>
                {selectedSize && parseInt(quantity) >= remaining && (
                  <span className="gm-stock-badge" style={{ color: getStockColor(remaining), borderColor: `${getStockColor(remaining)}44`, backgroundColor: `${getStockColor(remaining)}11` }}>
                    {remaining} RESTANTES
                  </span>
                )}
              </div>
            </div>

            {/* 7. Add to Cart */}
            <button
              className={`gm-btn-add-cart ${Number(product.stock) === 0 ? "gm-btn-disabled-agotado" : ""} ${showSizeError ? "gm-btn-error" : ""}`}
              onClick={handleModalAddToCart}
              disabled={Number(product.stock) === 0}
            >
              {Number(product.stock) === 0 ? (
                <><FaBan size={18} className="gm-btn-icon" /> <span className="gm-btn-label-desktop">agotado</span><span className="gm-btn-label-mobile">agotado</span></>
              ) : (
                <><FaShoppingCart size={18} className="gm-btn-icon" /> <span className="gm-btn-label-desktop">añadir al carrito</span><span className="gm-btn-label-mobile">añadir</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
