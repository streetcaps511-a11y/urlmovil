/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import '../../styles/ConfirmDeleteModal.css';
import React from 'react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2 className="delete-modal-title">Confirmar Salida</h2>

        <div className="delete-modal-message-container">
          <p className="delete-modal-message">
            ¿Estás seguro que deseas <span style={{ color: '#3b82f6', fontWeight: '800' }}>cerrar sesión</span>?
          </p>
          <p className="delete-modal-message" style={{ marginTop: '8px', opacity: 0.8, fontSize: '0.9rem' }}>
            Tendrás que volver a ingresar tus credenciales para acceder nuevamente.
          </p>
        </div>

        <div className="delete-modal-actions">
          <button 
            onClick={onClose} 
            className="delete-modal-btn delete-modal-btn-cancel"
          >
            Cancelar
          </button>

          <button 
            onClick={onConfirm} 
            className="delete-modal-btn delete-modal-btn-confirm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
