/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import '../../Home/styles/HomeHero.css'; // Mismo estilo que el Home

const CartHero = () => {
  return (
    <div className="gm-hero" style={{ background: 'transparent' }}>
      <div className="gm-hero-bg" style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(255,215,0, 0.10), transparent 55%),
          linear-gradient(90deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.80) 100%),
          url("https://res.cloudinary.com/dm8696z6p/image/upload/v1740927653/Banner_3_1_d9o2ay.png")
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        filter: 'saturate(1.05) contrast(1.02)'
      }} />

      <div className="gm-hero-fade-top" />
      <div className="gm-hero-fade-bottom" />

      <div className="gm-hero-inner">
        <h1 className="gm-hero-title">TU CARRITO DE COMPRAS</h1>
        <p className="gm-hero-sub">Administra tus productos y finaliza tu pedido</p>
      </div>
    </div>
  );
};

export default CartHero;
