/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import '../../styles/EntityTable.css';
import React from 'react';
import { FaEye, FaEdit, FaTrash, FaBan, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';

const CustomSwitch = ({ isCurrentlyActive, toggleAction, toggleTitle, activeColor = '#10b981', inactiveColor = '#ef4444' }) => {
  if (!toggleAction) return null;

  return (
    <button
      type="button"
      className={`custom-switch ${isCurrentlyActive ? 'active' : 'inactive'}`}
      onClick={toggleAction}
      data-tooltip={toggleTitle}
      style={{ '--switch-on-color': activeColor, '--switch-off-color': inactiveColor }}
    >
      <span className="custom-switch-thumb" />
    </button>
  );
};

const EntityTable = ({
  entities = [],
  columns = [],
  idField = 'id',
  onView,
  onEdit,
  onDelete,
  onAnular,
  onComplete,
  onApprove,
  onReject,
  onPartialPago,
  onReactivar,
  estadoField = 'estado',
  moduleType = 'generic',
  isAdministradorCheck = null,
  isActiveField,
  switchProps = {},
  isRestrictedActionCheck = null,
  loading = false,
}) => {
  const getEstadoField = () => {
    return estadoField || isActiveField || 'estado';
  };

  const isAdministrador = (row) =>
    isAdministradorCheck ? isAdministradorCheck(row) : false;

  const getDisplayValue = (value) => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      // 🛡️ Extraer nombre o label si es un objeto
      return value.nombre || value.Nombre || value.label || value.label || value.name || value.Name || '-';
    }
    
    if (Array.isArray(value)) {
      return value.map(v => (typeof v === 'object' ? (v.nombre || v.Nombre || String(v)) : v)).join(', ');
    }
    
    return String(value);
  };

  const isEmpty = !entities || entities.length === 0;

  // Formatear el mensaje según el tipo de módulo
  const getEmptyMessage = () => {
    switch (moduleType?.toLowerCase()) {
      case 'ventas': return 'No hay ventas registradas';
      case 'productos': return 'No hay productos disponibles';
      case 'categorias': return 'No hay categorías creadas';
      case 'proveedores': return 'No hay proveedores registrados';
      case 'compras': return 'No hay órdenes de compra';
      case 'clientes': return 'No hay clientes registrados';
      case 'usuarios': return 'No hay usuarios en el sistema';
      case 'roles': return 'No hay roles definidos';
      case 'devoluciones': return 'No hay devoluciones registradas';
      default: return 'No hay datos para mostrar';
    }
  };

  return (
    <div className="entity-table-container">
      <table className="entity-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i} 
                className="entity-table-header-cell"
                style={{ width: col.width || 'auto' }}
              >
                {col.header}
              </th>
            ))}
            <th className="entity-table-header-cell actions-header">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td 
                colSpan={columns.length + 1} 
                className="entity-table-cell entity-table-empty-row"
                style={{ 
                  backgroundColor: '#030712',
                  textAlign: 'center', 
                  padding: '100px 20px', 
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontStyle: 'italic',
                  fontSize: '15px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px', opacity: 0.6 }}>📂</span>
                  {getEmptyMessage()}
                </div>
              </td>
            </tr>
          ) : (
            entities.map((row, rowIndex) => {
              const estadoKey = getEstadoField();
              const estadoValue = row?.[estadoKey];
              const isCurrentlyActive =
                estadoValue === true ||
                estadoValue === 1 ||
                estadoValue === 'Activo' ||
                estadoValue === 'Completada';

              const admin = isAdministrador(row);
              const showSwitch = moduleType !== 'ventas' && moduleType !== 'compras';
              const toggleAction = showSwitch ? (isCurrentlyActive ? onAnular : onReactivar) : null;

              return (
                <tr key={row[idField] || rowIndex} className={rowIndex % 2 === 0 ? 'row-even' : 'row-odd'}>
                  {columns.map((col, colIndex) => {
                    const content = typeof col.render === 'function'
                      ? col.render(row)
                      : getDisplayValue(row?.[col.field]);

                    return (
                      <td
                        key={`${col.field}-${colIndex}`}
                        className="entity-table-cell"
                        data-tooltip={typeof content === 'string' ? content : ' '}
                      >
                        {content}
                      </td>
                    );
                  })}
                  <td className="entity-table-cell actions-cell">
                    <div className="actions-wrapper">
                      {isRestrictedActionCheck && isRestrictedActionCheck(row) ? (
                        <div className="actions-wrapper">
                          {onView && (
                            <span data-tooltip="Ver detalles">
                              <FaEye
                                size={18}
                                className="action-icon"
                                onClick={() => onView(row)}
                              />
                            </span>
                          )}
                        </div>
                      ) : admin ? (
                        <div className="actions-wrapper">
                          {onView && (
                            <span data-tooltip="Ver detalles">
                              <FaEye
                                size={18}
                                className="action-icon"
                                onClick={() => onView(row)}
                              />
                            </span>
                          )}
                          {onEdit && (
                            <span data-tooltip="Editar">
                              <FaEdit
                                size={18}
                                className="action-icon"
                                onClick={() => onEdit(row)}
                              />
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          {showSwitch && toggleAction && (
                            <CustomSwitch
                              isCurrentlyActive={isCurrentlyActive}
                              toggleAction={() => toggleAction(row)}
                              toggleTitle={isCurrentlyActive ? 'Desactivar' : 'Reactivar'}
                              activeColor={switchProps.activeColor}
                              inactiveColor={switchProps.inactiveColor}
                            />
                          )}

                          {onComplete && moduleType === 'compras' && row.estado === 'Pendiente' && (
                            <span data-tooltip="Marcar como completada">
                              <FaCheckCircle
                                size={18}
                                className="action-icon"
                                onClick={() => onComplete(row)}
                                style={{ color: '#10b981' }}
                              />
                            </span>
                          )}

                           {onApprove && row.estado === 'Pendiente' && (
                            <span data-tooltip="Aprobar">
                              <FaCheckCircle
                                size={18}
                                className="action-icon action-approve"
                                onClick={() => onApprove(row)}
                                style={{ color: '#10b981' }}
                              />
                            </span>
                          )}

                           {onReject && row.estado === 'Pendiente' && (
                            <span data-tooltip="Rechazar">
                              <FaTimesCircle
                                size={18}
                                className="action-icon action-reject"
                                onClick={() => onReject(row)}
                                style={{ color: '#ef4444' }}
                              />
                            </span>
                          )}

                          {onPartialPago && (row.estado === 'Pendiente' || row.estado === 'Pago Incompleto') && (
                            <span data-tooltip="Pago Incompleto">
                              <FaExclamationCircle
                                size={18}
                                className="action-icon action-partial"
                                onClick={() => onPartialPago(row)}
                                style={{ color: '#f59e0b' }}
                              />
                            </span>
                          )}

                          {onView && (
                            <span data-tooltip="Ver detalles">
                              <FaEye
                                size={18}
                                className="action-icon"
                                onClick={() => onView(row)}
                              />
                            </span>
                          )}

                          {onEdit && moduleType !== 'ventas' && moduleType !== 'compras' && (
                            <span data-tooltip="Editar">
                              <FaEdit
                                size={18}
                                className="action-icon"
                                onClick={() => onEdit(row)}
                              />
                            </span>
                          )}

                           {onAnular && (moduleType === 'ventas' || moduleType === 'compras') && (row.estado === 'Pendiente' || row.estado === 'Pago Incompleto') && (
                            <span data-tooltip="Anular">
                              <FaBan
                                size={18}
                                className="action-icon"
                                onClick={() => onAnular(row)}
                              />
                            </span>
                          )}

                          {onDelete && moduleType !== 'ventas' && moduleType !== 'compras' && (
                            <span data-tooltip="Eliminar">
                              <FaTrash
                                size={18}
                                className="action-icon"
                                onClick={() => onDelete(row)}
                              />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EntityTable;
