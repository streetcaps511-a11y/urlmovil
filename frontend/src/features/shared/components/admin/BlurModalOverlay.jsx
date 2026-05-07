/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import '../../styles/BlurModalOverlay.css';
// BlurModalOverlay.jsx
import React from 'react';

const BlurModalOverlay = ({ onClose, children }) => {
  return (
    <div className="blur-modal-overlay">
      <div
        className="blur-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default BlurModalOverlay;
