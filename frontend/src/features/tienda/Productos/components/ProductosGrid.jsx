/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import ProductCard from './ProductCard';
import PaginatedGrid from '../../shared/components/PaginatedGrid';
import '../styles/ProductosGrid.css';
import '../../shared/styles/Pagination.css';

/* ──────────────────────────────────────────────
   Componente principal ProductosGrid
   ────────────────────────────────────────────── */
const ProductosGrid = ({ 
  filteredProducts, 
  searchTerm, 
  initialProducts, 
  openModal, 
  safeImg, 
  getRatingFromProduct,
  selectedColors = [],
  selectedSizes = [],
  selectedCategories = [],
  allAvailableFilters = { categories: [], colors: [], sizes: [] },
  toggleFilter,
  clearFilters,
  setGlobalSearch,
}) => {

  return (
    <div className="gm-container">
      <div className="gm-products-page-layout">

        {/* CONTENIDO PRINCIPAL */}
        <main className="gm-products-main-content">

          {/* ⚡ ESTADO DE CARGA INICIAL */}
          {(!initialProducts || initialProducts.length === 0) && (
            <div className="gm-loading-container">
              <div className="gm-loader"></div>
              <p>Cargando catálogo premium...</p>
            </div>
          )}

          {/* Resultados de búsqueda */}
          {filteredProducts !== null && (
            <>
              <div className="gm-search-results-header">
                <div className="gm-search-title-row">
                  <h2 className="gm-search-title">
                    Resultados para: <span className="gm-search-term">"{searchTerm}"</span>
                  </h2>
                  <button onClick={clearFilters} className="gm-clean-btn">
                    <FaTimes size={14} /> Limpiar búsqueda
                  </button>
                </div>
                <p className="gm-search-count">
                  {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
                </p>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="gm-no-results">
                  <p>No se encontraron productos</p>
                  <button onClick={clearFilters} className="gm-primary-btn">
                    Ver todos los productos
                  </button>
                </div>
              ) : (
                <PaginatedGrid
                  products={filteredProducts}
                  openModal={openModal}
                  safeImg={safeImg}
                  getRatingFromProduct={getRatingFromProduct}
                  ProductCardComponent={ProductCard}
                />
              )}
            </>
          )}

          {/* Todos los productos (sin búsqueda activa) */}
          {filteredProducts === null && initialProducts && initialProducts.length > 0 && (
            <PaginatedGrid
              products={(initialProducts).filter(p => p.isActive !== false && p.stock > 0)}
              openModal={openModal}
              safeImg={safeImg}
              getRatingFromProduct={getRatingFromProduct}
              ProductCardComponent={ProductCard}
            />
          )}

        </main>
      </div>
    </div>
  );
};

export default ProductosGrid;
