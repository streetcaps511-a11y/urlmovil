/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import '../../styles/ConfirmDeleteModal.css';
// src/components/ConfirmDeleteModal.jsx
import React from 'react';

// Función auxiliar para obtener el mejor nombre a mostrar (SIN CAMBIOS)
const getDisplayName = (data, nameType) => {
  if (!data) return `este ${nameType}`;
  
  // Prioridad 1: Nombres específicos
  if (data.nombreCompleto) return data.nombreCompleto; // Clientes, Usuarios, Proveedores
  if (data.nombreProducto) return data.nombreProducto; // Productos, Devoluciones
  if (data.numeroDocumento) return data.numeroDocumento; // Devoluciones (CC)
  
  // Prioridad 2: Nombres genéricos
  if (data.name) return data.name; // ✅ AGREGADO: Para roles (tiene propiedad 'name')
  if (data.nombre) return data.nombre; // Producto
  if (data.Nombre) return data.Nombre; // Categorías, Roles, Productos (si se usa 'Nombre' mayúscula)
  
  // Prioridad 3: ID de respaldo
  if (data.id && typeof data.id === 'string' && data.id.startsWith('dev-')) {
    // Si es un ID interno de devolución (dev-...), no lo mostramos.
  } else if (data.id) {
    return `#${data.id}`;
  }

  // Fallback
  return `el ${nameType}`;
};

const ConfirmDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  entityName = "elemento", 
  entityData, 
  customMessage,
  loading = false,
  loadingText = "Eliminando..."
}) => {
  if (!isOpen) return null;

  const nameToDisplay = getDisplayName(entityData, entityName);
  const isGenericFallback = nameToDisplay === `el ${entityName}`;
  
  // Si hay un mensaje personalizado, usarlo
  const displayMessage = customMessage || `Estás a punto de eliminar ${isGenericFallback ? `el ${entityName}` : `el/la ${entityName}`}:`;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2 className="delete-modal-title">Confirmar Eliminación</h2>

        <div className="delete-modal-message-container">
          <p className="delete-modal-message">
            Estás a punto de eliminar el/la {entityName}: <span style={{ color: '#3b82f6', fontWeight: '800' }}>{nameToDisplay}</span>
            <span className="delete-modal-highlight">. ¿Deseas continuar?</span>
          </p>
        </div>

        <div className="delete-modal-actions">
          <button 
            onClick={onClose} 
            className="delete-modal-btn delete-modal-btn-cancel"
            disabled={loading}
          >
            Cancelar
          </button>

          <button 
            onClick={onConfirm} 
            className={`delete-modal-btn delete-modal-btn-confirm ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? loadingText : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
