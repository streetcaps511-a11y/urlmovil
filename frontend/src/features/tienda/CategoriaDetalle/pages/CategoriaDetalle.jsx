/* === PÁGINA PRINCIPAL === 
   Este componente es la interfaz visual principal de la ruta. 
   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */

import '../styles/CategoriaDetalle.css';
import '../styles/CategoryHero.css';
import '../../shared/styles/Pagination.css';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import SuccessToast from '../components/SuccessToast';
import PaginatedGrid from '../../shared/components/PaginatedGrid';
import { useCategoriaDetalle } from '../hooks/useCategoriaDetalle';

const CategoriaDetalle = () => {
  const {
    nombreCategoria,
    descripcionCategoria,
    productos,
    selectedProduct,
    selectedSize,
    quantity,
    showSizeError,
    showSuccessToast,
    loading,
    sizesForModal,
    handleOpenModal,
    closeModal,
    handleSizeSelect,
    incrementQuantity,
    decrementQuantity,
    handleQuantityInput,
    handleAddToCart,
    getRatingFromProduct,
    safeImg,
    BULK_MIN_QTY,
    normalizeSizes,
  } = useCategoriaDetalle();

  return (
    <div className="gm-home" style={{ background: "var(--gm-bg)" }}>
      <div className="gm-hero">
        <div className="gm-hero-bg" />
        <div className="gm-hero-fade-top" />
        <div className="gm-hero-fade-bottom" />
        <div className="gm-hero-inner">
          <Link to="/categorias" className="gm-pill-btn gm-back-btn">
            <FaArrowLeft /> <span>Volver a Categorías</span>
          </Link>
          <h1 className="gm-hero-title">{nombreCategoria}</h1>
          <p className="gm-hero-sub">
            {descripcionCategoria || "Explora nuestra colección exclusiva con los mejores diseños."}
          </p>
        </div>
      </div>
      
      <div className="gm-container">
        <div className="gm-products-page-layout" style={{ marginTop: '30px' }}>
          {/* CONTENIDO PRINCIPAL */}
          <main className="gm-products-main-content">

            {/* Grid de productos paginado */}
            {productos.length > 0 ? (
              <PaginatedGrid 
                products={productos}
                openModal={handleOpenModal}
                safeImg={safeImg}
                getRatingFromProduct={getRatingFromProduct}
                ProductCardComponent={ProductCard}
              />
            ) : (
              !loading && (
                <div style={{ textAlign: 'center', padding: '100px 20px', color: '#9CA3AF' }}>
                  <p>No se encontraron productos con estos filtros.</p>
                </div>
              )
            )}
          </main>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct}
          closeModal={closeModal}
          safeImg={safeImg}
          BULK_MIN_QTY={BULK_MIN_QTY}
          sizesForModal={sizesForModal}
          selectedSize={selectedSize}
          handleSizeSelect={handleSizeSelect}
          showSizeError={showSizeError}
          quantity={quantity}
          decrementQuantity={decrementQuantity}
          incrementQuantity={incrementQuantity}
          handleQuantityInput={handleQuantityInput}
          handleModalAddToCart={handleAddToCart}
          normalizeSizes={normalizeSizes}
        />
      )}

      <SuccessToast show={showSuccessToast} />
      
    </div>
  );
};

export default CategoriaDetalle;

