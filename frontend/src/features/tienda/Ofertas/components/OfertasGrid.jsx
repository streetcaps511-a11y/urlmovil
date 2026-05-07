/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import ProductCard from './ProductCard';
import PaginatedGrid from '../../shared/components/PaginatedGrid';
import '../styles/OfertasGrid.css';
import '../../shared/styles/Pagination.css';

const OfertasGrid = ({ 
  searchFiltered, 
  searchTerm, 
  setGlobalSearch, 
  ofertas, 
  openModal, 
  safeImg, 
  getRatingFromProduct,
  loading = false
}) => {
  // Siempre usamos la lista que toque renderizar
  const displayProducts = searchFiltered !== null ? searchFiltered : ofertas;

  return (
    <div className="gm-container">
      {/* Resultados de búsqueda si existen */}
      {searchFiltered !== null && (
        <div className="gm-search-header-container">
          <div className="gm-search-results-header">
            <h2 className="gm-search-title">
              Resultados para: <span className="gm-search-term">"{searchTerm}"</span>
            </h2>
            <button 
              onClick={() => setGlobalSearch("")} 
              className="gm-clean-search-btn"
            >
              <FaTimes size={14} /> Limpiar búsqueda
            </button>
          </div>
          <p className="gm-search-count">
            {searchFiltered.length} producto{searchFiltered.length !== 1 ? "s" : ""} encontrado{searchFiltered.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {displayProducts.length === 0 && !loading ? (
        <div className="gm-no-offers">
          <p>{searchFiltered !== null ? "No se encontraron productos" : "No hay ofertas disponibles en este momento."}</p>
          {searchFiltered !== null && (
            <button onClick={() => setGlobalSearch("")} className="gm-pill-btn">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <PaginatedGrid
          products={displayProducts}
          openModal={openModal}
          safeImg={safeImg}
          getRatingFromProduct={getRatingFromProduct}
          ProductCardComponent={ProductCard}
          badgeLabel="Oferta"
          badgeType="oferta"
        />
      )}
    </div>
  );
};

export default OfertasGrid;
