/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';

const UserFormFields = ({ 
  editingUser, 
  formData, 
  handleInputChange, 
  errors, 
  users, 
  closeModal, 
  handleSave, 
  isAdministrador,
  availableRoles = [],
  isReadOnly = false
}) => {
  const isEditingAdmin = editingUser && isAdministrador(editingUser);
  
  const renderField = (label, fieldName, type = 'text', options = []) => {
    const isError = errors[fieldName];
    const value = formData[fieldName] || '';
    const isSelectField = ['tipoDocumento', 'rol'].includes(fieldName);

    if (isSelectField) {
      if (fieldName === 'rol' && isEditingAdmin) {
        return (
          <div className="form-field form-field-horizontal">
            <label className="form-label">{label}:</label>
            <div className="admin-badge-field">
              <FaShieldAlt size={14} />
              Administrador (sistema)
            </div>
            <input type="hidden" name="rol" value="1" />
            <div className="field-error" style={{ height: '10px' }}></div>
          </div>
        );
      }

      let fieldOptions = options;
      if (fieldName === 'rol') {
        const existingAdmin = users.find(u => isAdministrador(u));
        
        fieldOptions = availableRoles
          .filter(r => {
            const isAdminRole = (r.id === 1 || r.id === "1" || (r.name || r.Nombre || "").toLowerCase() === 'administrador');
            if (isAdminRole) {
               return editingUser && isAdministrador(editingUser);
            }
            return true;
          })
          .map(r => ({
            value: r.id, 
            label: (r.name || r.Nombre || "").charAt(0).toUpperCase() + (r.name || r.Nombre || "").slice(1).toLowerCase()
          }));
      }

      return (
        <div className="form-field">
          <label className={`form-label ${isReadOnly ? 'readonly-field' : ''}`}>{label}:{!isReadOnly && <span className="required">*</span>}</label>
          <select
            name={fieldName}
            disabled={isReadOnly || (fieldName === 'rol' && isEditingAdmin)}
            value={fieldName === 'rol' && isEditingAdmin ? (value || '1') : value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={`form-select ${isError ? 'has-error' : ''} ${(isReadOnly || (fieldName === 'rol' && isEditingAdmin)) ? 'disabled-field' : ''} ${isReadOnly ? 'readonly-field' : ''}`}
          >
            <option value="" disabled hidden>Seleccionar...</option>
            {fieldOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className="field-error">{isError}</div>
        </div>
      );
    }

    return (
      <div className="form-field">
        <label className={`form-label ${isReadOnly ? 'readonly-field' : ''}`}>{label}:{!isReadOnly && <span className="required">*</span>}</label>
        <input
          type={type}
          name={fieldName}
          value={value}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          onChange={(e) => {
            if (isReadOnly) return;
            let val = e.target.value;
            if (fieldName === 'numeroDocumento' || fieldName === 'contacto') {
              val = val.replace(/[^0-9]/g, '').slice(0, 15);
            }
            handleInputChange(fieldName, val);
          }}
          placeholder={isReadOnly ? '' : `Ingrese ${label.toLowerCase()}...`}
          className={`form-input ${isError ? 'has-error' : ''} ${isReadOnly ? 'disabled-field readonly-field' : ''}`}
        />
        <div className="field-error">{isError}</div>
      </div>
    );
  };

  return (
    <div className="user-form">
      <div className="form-body">
        <div className="form-row">
          <div className="col">
            {renderField('Tipo documento', 'tipoDocumento', 'select', [
              { value: 'Cédula de Ciudadanía', label: 'Cédula de ciudadanía' },
              { value: 'Cédula de Extranjería', label: 'Cédula de extranjería' },
              { value: 'Permiso Especial (PEP)', label: 'Permiso especial (PEP)' },
              { value: 'Permiso Temporal (PPT)', label: 'Permiso temporal (PPT)' },
              { value: 'Pasaporte', label: 'Pasaporte' }
            ])}
          </div>
          <div className="col">
            {renderField('N° documento', 'numeroDocumento', 'text')}
          </div>
        </div>

        <div className="form-row">
          <div className="col">
            {renderField('Nombre completo', 'nombreCompleto', 'text')}
          </div>
        </div>

        <div className="form-row">
          <div className="col">
            {renderField('Email', 'email', 'text')}
          </div>
        </div>

        <div className="form-row">
          <div className="col">
            {renderField('Teléfono', 'contacto', 'text')}
          </div>
        </div>
        
        <div className="form-row">
          <div className="col">
            {renderField('Rol', 'rol', 'select')}
          </div>
          <div className="col">
            {/* Espacio balanceado */}
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserFormFields;
