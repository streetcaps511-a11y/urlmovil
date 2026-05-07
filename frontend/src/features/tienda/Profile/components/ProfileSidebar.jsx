/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { 
  FaUser, FaCamera, FaPlus, FaTrash, FaShieldAlt, 
  FaIdCard, FaShoppingBag, FaExchangeAlt, FaWindowClose, FaTachometerAlt,
  FaBars, FaTimes, FaSearch
} from "react-icons/fa";
import '../styles/ProfileSidebar.css';

const ProfileSidebar = ({ 
  user, isAdmin, avatarUrl, getAvatarInitial, showAvatarMenu, 
  setShowAvatarMenu, openFilePicker, onPickAvatar, removeAvatar, 
  fileInputRef, activeTab, setActiveTab, onLogout, setOrderView, 
  setReturnView, setConfirmModal 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setOrderView('list');
    setReturnView('list');
    setIsMobileMenuOpen(false); // Cerrar menú al clickear en móvil
  };

  return (
    <aside className={`gm-profile-sidebar-container ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {/* Overlay para cerrar el menú al tocar fuera */}
      {isMobileMenuOpen && (
        <div className="gm-profile-nav-overlay" onClick={toggleMobileMenu} />
      )}

      <div className="gm-profile-sidebar">
        {isAdmin && (
          <button 
            onClick={() => window.location.href = "/admin/dashboard"} 
            className="gm-admin-badge"
          >
            <FaTachometerAlt /> DASHBOARD
          </button>
        )}
        
        <div className="gm-profile-sidebar-header">
          <div className="gm-avatar-container">
            <div className="gm-avatar-wrapper">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="gm-avatar-img" />
              ) : (
                <span className="gm-avatar-initial">{getAvatarInitial()}</span>
              )}
            </div>
            <button 
              onClick={() => setShowAvatarMenu(!showAvatarMenu)} 
              className="gm-camera-btn"
              title="Opciones de avatar"
            >
              <FaCamera size={16} />
            </button>
            {showAvatarMenu && (
              <div className="gm-avatar-menu">
                <button 
                  onClick={() => { setShowAvatarMenu(false); openFilePicker(); }}
                  className="gm-avatar-menu-item"
                >
                  <FaCamera style={{ marginRight: '8px' }} /> Cambiar foto
                </button>
                {avatarUrl && (
                  <button 
                    onClick={() => { setShowAvatarMenu(false); removeAvatar(); }}
                    className="gm-avatar-menu-item gm-avatar-menu-item-danger"
                  >
                    <FaTrash style={{ marginRight: '8px' }} /> Eliminar foto
                  </button>
                )}
                <button 
                  onClick={() => setShowAvatarMenu(false)}
                  className="gm-avatar-menu-item"
                >
                  <FaTimes style={{ marginRight: '8px' }} /> Cancelar
                </button>
              </div>
            )}
          </div>
          
          <div className="gm-user-info-text">
            <h2 className="gm-user-name">
              {user.Nombre || user.usuario || user.Username || user.nombre || user.Nombres || user.name || user.fullName || ''}
            </h2>
          </div>

          <button 
            className="gm-mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            aria-label="Abrir navegación de perfil"
          >
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <input ref={fileInputRef} type="file" onChange={onPickAvatar} style={{ display: "none" }} accept="image/*" />
      </div>

      <div className={`gm-profile-nav ${isMobileMenuOpen ? 'show' : ''}`}>
        <div className="gm-mobile-nav-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaShoppingBag color="#FFC107" size={18} />
            <span>Menú Perfil</span>
          </div>
          <button onClick={toggleMobileMenu}><FaTimes /></button>
        </div>
        
        <div className="gm-nav-menu-items">
          <button 
            onClick={() => handleNavClick('account')} 
            className={`gm-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
          >
            <FaShieldAlt /> mi cuenta
          </button>
          <button 
            onClick={() => handleNavClick('info')} 
            className={`gm-nav-btn ${activeTab === 'info' ? 'active' : ''}`}
          >
            <FaIdCard /> Información Personal
          </button>
          <button 
            onClick={() => handleNavClick('orders')} 
            className={`gm-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <FaShoppingBag /> Mis Pedidos
          </button>
          <button 
            onClick={() => handleNavClick('returns')} 
            className={`gm-nav-btn ${activeTab === 'returns' ? 'active' : ''}`}
          >
            <FaExchangeAlt /> Devoluciones
          </button>
        </div>

        <div className="gm-nav-logout">
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              setConfirmModal({
                open: true,
                title: "Cerrar Sesión",
                message: "¿Estás seguro?",
                confirmText: "ACEPTAR",
                isDanger: true,
                onConfirm: () => onLogout()
              });
            }} 
            className="gm-logout-btn"
          >
            <FaWindowClose /> Cerrar Sesión
          </button>
        </div>

        <div className="gm-sidebar-brand-deco">
          <div className="gm-sidebar-deco-text">GM EXCLUSIVE</div>
        </div>
      </div>
    </aside>
  );
};

export default ProfileSidebar;
