/* === COMPONENTE REUTILIZABLE === 
   Tres inputs independientes: día / mes / año
   Editar uno no afecta los otros */

import '../../styles/DateInputWithCalendar.css';
import React, { useRef } from "react";
import { FaCalendarAlt } from "react-icons/fa";

const DateInputWithCalendar = ({ value, onChange, error, className = "" }) => {
  const hiddenDateRef = useRef(null);
  const mmRef = useRef(null);
  const yyyyRef = useRef(null);

  // Parsear el valor actual "DD/MM/YYYY" en partes
  const parts = (value || '').split('/');
  const dd = parts[0] || '';
  const mm = parts[1] || '';
  const yyyy = parts[2] || '';

  const emit = (newDd, newMm, newYyyy) => {
    // Solo emitimos el valor completo (partes pueden estar vacías)
    if (!newDd && !newMm && !newYyyy) { onChange(''); return; }
    const result = `${newDd || ''}/${newMm || ''}/${newYyyy || ''}`;
    // Limpiar trailing slashes si no hay nada
    if (result === '//') { onChange(''); return; }
    onChange(result);
  };

  const handleDd = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    if (parseInt(raw, 10) > 31) raw = '31';
    emit(raw, mm, yyyy);
    if (raw.length === 2) mmRef.current?.focus();
  };

  const handleMm = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    if (parseInt(raw, 10) > 12) raw = '12';
    emit(dd, raw, yyyy);
    if (raw.length === 2) yyyyRef.current?.focus();
  };

  const handleYyyy = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    emit(dd, mm, raw);
  };

  const handleYyyyBlur = async () => {
    if (yyyy && yyyy.length === 4) {
      const currentYear = new Date().getFullYear();
      if (parseInt(yyyy, 10) > currentYear) {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Año inválido',
          text: `No puedes ingresar un año futuro. El año máximo es ${currentYear}.`
        });
        emit(dd, mm, currentYear.toString());
      }
    }
  };

  const openCalendar = () => {
    if (hiddenDateRef.current?.showPicker) {
      hiddenDateRef.current.showPicker();
    } else {
      hiddenDateRef.current?.click();
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center',
  };

  return (
    <div className={`date-input-container ${className}`}>
      <div className={`date-input-visual ${error ? 'has-error' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <input
          type="text"
          value={dd}
          onChange={handleDd}
          placeholder="dd"
          maxLength="2"
          style={{ ...inputStyle, width: '20px' }}
        />
        <span style={{ color: '#64748b', fontSize: '12px', userSelect: 'none' }}>/</span>
        <input
          ref={mmRef}
          type="text"
          value={mm}
          onChange={handleMm}
          placeholder="mm"
          maxLength="2"
          style={{ ...inputStyle, width: '20px' }}
        />
        <span style={{ color: '#64748b', fontSize: '12px', userSelect: 'none' }}>/</span>
        <input
          ref={yyyyRef}
          type="text"
          value={yyyy}
          onChange={handleYyyy}
          onBlur={handleYyyyBlur}
          placeholder="aaaa"
          maxLength="4"
          style={{ ...inputStyle, width: '50px' }}
        />
        <FaCalendarAlt
          className="date-input-icon"
          onClick={openCalendar}
          style={{ marginLeft: '4px', flexShrink: 0 }}
        />
      </div>

      <input
        ref={hiddenDateRef}
        type="date"
        className="date-input-hidden"
        onChange={(e) => {
          if (!e.target.value) return;
          const [year, month, day] = e.target.value.split("-");
          onChange(`${day}/${month}/${year}`);
        }}
      />
    </div>
  );
};

export default DateInputWithCalendar;
