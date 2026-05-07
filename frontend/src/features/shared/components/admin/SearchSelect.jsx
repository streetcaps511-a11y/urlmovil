/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaTimes, FaSearch } from 'react-icons/fa';

const SearchSelect = ({ 
  options = [], 
  onSelect, 
  placeholder = "Seleccionar...", 
  selectedItem = null,
  renderOption = null,
  filterFn = null,
  noResultsText = "No se encontraron resultados",
  loadingText = null,
  className = "",
  error = false,
  height = "48px",
  onFreeText = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Si hay texto escrito y no se seleccionó nada, avisar al padre
        if (onFreeText && searchTerm.trim() && !selectedItem) {
          onFreeText(searchTerm.trim());
        }
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, selectedItem, onFreeText]);

  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    if (filterFn) return filterFn(option, searchTerm);
    
    // Default filter: string name
    const name = option.nombre || option.label || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    // No abrir si está cargando
    if (loadingText) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className={`search-select-container ${className} ${error ? 'has-error' : ''}`} ref={containerRef}>
      <div className="search-select-header" onClick={handleToggle} style={{ height }}>
        <div className="search-select-selected">
          {loadingText ? (
            <span className="placeholder-text" style={{ opacity: 0.6 }}>⏳ {loadingText}</span>
          ) : isOpen ? (
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              className="header-search-input"
              placeholder={selectedItem ? (typeof selectedItem === 'object' ? (selectedItem.nombre || selectedItem.label || selectedItem.Nombre) : selectedItem) : placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            selectedItem ? (
              <span className="selected-text">
                {typeof selectedItem === 'object' 
                  ? (selectedItem.nombre || selectedItem.label || selectedItem.Nombre || `ID: ${selectedItem.id || selectedItem.IdVenta || '...'}`)
                  : selectedItem
                }
              </span>
            ) : (
              <span className="placeholder-text">{placeholder}</span>
            )
          )}
        </div>
        <div className="search-select-icons">
          <FaChevronDown className={`icon-arrow ${isOpen ? 'open' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div 
          className="search-select-dropdown"
          style={{
            position: 'fixed',
            top: coords.top + 5,
            left: coords.left,
            width: coords.width,
            zIndex: 9999
          }}
        >
          <div className="options-list yellow-scrollbar">
            {loadingText ? (
              <div className="no-results" style={{ color: '#F5C81B', opacity: 0.7 }}>
                ⏳ {loadingText}
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div 
                  key={option.id || index} 
                  className={`option-item ${selectedItem?.id === option.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {renderOption ? renderOption(option, index) : (
                    <span>{index + 1}. {option.nombre || option.label || option}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="no-results">{noResultsText}</div>
            )}
          </div>
        </div>
      )}

      <style jsx="true">{`
        .search-select-container {
          position: relative;
          width: 100%;
        }

        .search-select-header {
          background-color: transparent; 
          border: 1px solid #334155; 
          border-radius: 8px; 
          padding: 0 12px; 
          color: #fff; 
          height: 34px; 
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .search-select-container.has-error .search-select-header {
          border-color: #ef4444;
          background-color: rgba(239, 68, 68, 0.05);
        }

        .search-select-header:hover {
          border-color: #FFD70050;
        }

        .search-select-selected {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .placeholder-text {
          color: #94a3b8;
        }

        .search-select-icons {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
        }

        .icon-clear {
          font-size: 12px;
          transition: color 0.2s;
        }

        .icon-clear:hover {
          color: #ef4444;
        }

        .icon-arrow {
          font-size: 12px;
          transition: transform 0.2s;
        }

        .icon-arrow.open {
          transform: rotate(180deg);
        }

        .header-search-input {
          width: 100%;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 14px;
          outline: none;
          padding: 0;
        }

        .header-search-input::placeholder {
          color: #94a3b8;
          opacity: 0.7;
        }

        .search-select-dropdown {
          position: fixed;
          background-color: #0c0f14;
          border: 1px solid #FFD70050;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          overflow: hidden;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .options-list {
          max-height: 350px;
          overflow-y: auto;
        }

        .option-item {
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid #ffffff10;
          color: #ffffff; /* Brighter */
        }

        .option-item:last-child {
          border-bottom: none;
        }

        .option-item:hover {
          background-color: #FFD70010;
        }

        .option-item.selected {
          background-color: #FFD70020;
          border-left: 3px solid #FFD700;
        }

        .no-results {
          padding: 16px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        /* Fix for native selects in dark mode */
        select option {
          background-color: #0c0f14 !important;
          color: #ffffff !important;
        }

        /* Scrollbar styling */
        .yellow-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .yellow-scrollbar::-webkit-scrollbar-track {
          background: #0c0f14;
        }
        .yellow-scrollbar::-webkit-scrollbar-thumb {
          background: #FFD70040;
          border-radius: 10px;
        }
        .yellow-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #FFD70060;
        }
      `}</style>
    </div>
  );
};

export default SearchSelect;
