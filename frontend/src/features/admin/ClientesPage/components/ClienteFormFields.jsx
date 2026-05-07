/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';

export const ClienteFormFields = ({ modalState, formData, handleInputChange, errors, departamentos, ciudades, loadingCities, handleToggleViewMode, closeModal, handleSave, firstInputRef }) => {
  const isReadOnly = modalState.mode === 'view';
  const isEdit = modalState.mode === 'edit';

  const renderField = (label, value) => (
    <div className="form-field">
      <label className="form-field-label">{label}:</label>
      <div className="form-field-display">
        {value || 'N/A'}
      </div>
    </div>
  );

  if (isReadOnly) {
    const cliente = modalState.cliente;
    return (
      <div className="clientes-form-grid" style={{ gap: '10px' }}>
        <div className="clientes-form-row">
          <div className="clientes-form-col">{renderField('Tipo documento', cliente?.tipoDocumento)}</div>
          <div className="clientes-form-col">{renderField(cliente?.tipoDocumento === 'NIT' ? 'Número' : 'Número documento', cliente?.numeroDocumento)}</div>
        </div>
        <div>{renderField(cliente?.tipoDocumento === 'NIT' ? 'Nombre de la empresa' : 'Nombre completo', cliente?.nombreCompleto)}</div>
        <div className="clientes-form-row">
          <div className="clientes-form-col">{renderField('Email', cliente?.email)}</div>
          <div className="clientes-form-col">{renderField('Teléfono', cliente?.telefono)}</div>
        </div>
        <div>{renderField('Dirección', cliente?.direccion)}</div>
        <div className="clientes-form-row">
          <div className="clientes-form-col">{renderField('Departamento', cliente?.departamento)}</div>
          <div className="clientes-form-col">{renderField('Ciudad', cliente?.ciudad)}</div>
        </div>
        
      </div>
    );
  }

  const renderEditableField = (label, fieldName, type = "text", options = []) => {
    const isError = errors[fieldName];
    
    if (type === 'select') {
      let fieldOptions = options;
      if (fieldName === 'department') {
        fieldOptions = departamentos.map(d => ({ value: d.id, label: d.name }));
      } else if (fieldName === 'city') {
        fieldOptions = ciudades.map(c => ({ value: c.id, label: c.name }));
      } else if (fieldName === 'documentType') {
        fieldOptions = [
          { value: 'Cédula de Ciudadanía', label: 'Cédula de ciudadanía' },
          { value: 'Cédula de Extranjería', label: 'Cédula de extranjería' },
          { value: 'Permiso Especial (PEP)', label: 'Permiso especial (PEP)' },
          { value: 'Permiso Temporal (PPT)', label: 'Permiso temporal (PPT)' },
          { value: 'Pasaporte', label: 'Pasaporte' },
          { value: 'NIT', label: 'NIT' },
        ];
      }
      return (
        <div>
          <label className="form-field-label">{label}: <span style={{ color: "#ef4444" }}>*</span></label>
          <select
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            disabled={fieldName === 'city' && loadingCities}
            className={`form-field-input ${isError ? 'has-error' : ''}`}
          >
            <option value="" disabled hidden>Seleccionar...</option>
            {fieldOptions.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {isError && <div className="form-field-error-text">{isError}</div>}
        </div>
      );
    }
    return (
      <div>
        <label className="form-field-label">{label}: <span style={{ color: "#ef4444" }}>*</span></label>
        <input
          ref={fieldName === 'documentNumber' ? firstInputRef : null}
          type={type}
          value={formData[fieldName] || ''}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          maxLength={fieldName === 'documentNumber' ? (formData.documentType === 'NIT' ? 10 : (formData.documentType === 'Pasaporte' ? 20 : 15)) : undefined}
          className={`form-field-input ${isError ? 'has-error' : ''}`}
        />
        {isError && <div className="form-field-error-text">{isError}</div>}
      </div>
    );
  };

  return (
    <div className="clientes-form-grid">
      <div className="clientes-form-row">
        <div className="clientes-form-col">{renderEditableField('Tipo documento', 'documentType', 'select')}</div>
        <div className="clientes-form-col">{renderEditableField(formData.documentType === 'NIT' ? 'Número' : 'N° documento', 'documentNumber', 'text')}</div>
      </div>
      <div>{renderEditableField(formData.documentType === 'NIT' ? 'Nombre de la empresa' : 'Nombre completo', 'fullName', 'text')}</div>
      <div className="clientes-form-row">
        <div className="clientes-form-col">{renderEditableField('Email', 'email', 'text')}</div>
        <div className="clientes-form-col">{renderEditableField('Teléfono', 'phone', 'text')}</div>
      </div>
      <div>{renderEditableField('Dirección', 'address', 'text')}</div>
      <div className="clientes-form-row">
        <div className="clientes-form-col">{renderEditableField('Departamento', 'department', 'select')}</div>
        <div className="clientes-form-col">{renderEditableField('Ciudad', 'city', 'select')}</div>
      </div>

    </div>
  );
};
