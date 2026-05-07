import React, { useState, useEffect } from 'react';

const INITIAL_ITEMS = 7; // Siempre 7 inicialmente
const LOAD_MORE_STEP = 7; // Siempre 7 al cargar más

const PaginatedGrid = ({ 
  products, 
  openModal, 
  safeImg, 
  getRatingFromProduct, 
  ProductCardComponent,
  badgeLabel = null,
  badgeType = null,
  initialCount = INITIAL_ITEMS,
  loadMoreStep = LOAD_MORE_STEP
}) => {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const Card = ProductCardComponent;

  useEffect(() => {
    // Resetear al cambiar la lista de productos (por filtros o búsqueda)
    setVisibleCount(initialCount);
  }, [products, initialCount]);

  const shown = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + loadMoreStep);
  };

  return (
    <>
      <div className="gm-products-grid">
        {shown.map((p) => (
          <Card
            key={p.id}
            product={p}
            openModal={openModal}
            onOpenModal={openModal}
            safeImg={safeImg}
            getRatingFromProduct={getRatingFromProduct}
            badge={badgeLabel || (p.hasDiscount || p.oferta ? "Oferta" : (p.destacado || p.isFeatured ? "Destacado" : null))}
            badgeType={badgeType || (p.hasDiscount || p.oferta ? "oferta" : (p.destacado || p.isFeatured ? "destacado" : null))}
          />
        ))}
      </div>

      <div className="gm-load-more-section" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '10px 0 0px 0', 
        marginTop: '0px'
      }}>
        {hasMore ? (
          <button 
            className="gm-load-more-btn-premium" 
            onClick={handleLoadMore} 
            style={{
              background: 'transparent',
              border: '2px solid #F5C81B',
              padding: '12px 45px',
              borderRadius: '8px',
              color: '#F5C81B',
              fontWeight: '700',
              fontSize: '13px',
              fontFamily: "'Inter', 'Outfit', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 200, 27, 0.1)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 200, 27, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Ver más productos
          </button>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '0px'
          }}>
            <p style={{ 
              color: '#ffffff', 
              fontSize: '12px', 
              fontWeight: '500', 
              letterSpacing: '0.5px',
              textTransform: 'lowercase',
              opacity: 0.4,
              marginBottom: '5px'
            }}>
              ya no hay más productos
            </p>
            <div style={{ width: '30px', height: '1px', background: '#F5C81B', opacity: 0.2 }}></div>
          </div>
        )}
      </div>
    </>
  );
};

export default PaginatedGrid;
