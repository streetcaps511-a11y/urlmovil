/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import '../../styles/EntityDetailsModal.css';
// src/components/EntityDetailsModal.jsx
import React from 'react';

const EntityDetailsModal = ({ isOpen, onClose, entityData, title = "Detalles" }) => {
  if (!isOpen || !entityData) return null;

  const renderField = (label, value) => (
    <div className="details-row">
      <label className="details-label">
        {label}:
      </label>
      <span className="details-value">
        {value || 'N/A'}
      </span>
    </div>
  );

  return (
    <div className="details-modal-backdrop">
      <div className="details-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2 className="details-modal-title">
          {title}
        </h2>

        <div className="details-modal-fields">
          {Object.entries(entityData).map(([key, value]) => (
            <React.Fragment key={key}>
              {renderField(
                key.replace(/([A-Z])/g, ' $1').trim(),
                typeof value === 'object' ? JSON.stringify(value) : String(value)
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={onClose}
          className="details-modal-close-btn"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default EntityDetailsModal;
