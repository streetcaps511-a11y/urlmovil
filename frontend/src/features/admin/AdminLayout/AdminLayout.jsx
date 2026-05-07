// src/features/admin/AdminLayout/AdminLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  FaUser, FaHome, FaBox, FaUsers, FaShoppingCart, FaChartBar,
  FaExchangeAlt, FaShieldAlt, FaTag, FaTruck, FaSignOutAlt,
  FaUserTie, FaUserCircle, FaCalendarAlt, FaChevronDown,
  FaBars, FaTimes
} from "react-icons/fa";
import { useAuth } from "../../shared/contexts/AuthContext";
import LogoutModal from "../../shared/components/admin/LogoutModal";
import './AdminLayout.css';

// ===== CONFIGURACIÓN DEL MENÚ JERÁRQUICO =====
const menuConfig = [
  { id: "dashboard", label: "Dashboard", icon: FaHome, path: "/admin/dashboard", type: 'link' },
  {
    id: "compras-group",
    label: "Compras",
    icon: FaShoppingCart,
    type: 'group',
    subItems: [
      { id: "proveedores", label: "Proveedores", icon: FaTruck,        path: "/admin/proveedores" },
      { id: "compras",     label: "Compras",      icon: FaShoppingCart, path: "/admin/compras" },
      { id: "categorias",  label: "Categorías",   icon: FaTag,          path: "/admin/categorias" },
      { id: "productos",   label: "Productos",    icon: FaBox,          path: "/admin/productos" },
    ]
  },
  {
    id: "ventas-group",
    label: "Ventas",
    icon: FaChartBar,
    type: 'group',
    subItems: [
      { id: "clientes",     label: "Clientes",     icon: FaUsers,       path: "/admin/clientes" },
      { id: "ventas",       label: "Ventas",       icon: FaChartBar,    path: "/admin/ventas" },
      { id: "devoluciones", label: "Devoluciones", icon: FaExchangeAlt, path: "/admin/devoluciones" },
    ]
  },
  {
    id: "usuarios-group",
    label: "Usuarios",
    icon: FaUser,
    type: 'group',
    subItems: [
      { id: "usuarios", label: "Usuarios", icon: FaUser,      path: "/admin/usuarios" },
      { id: "roles",    label: "Roles",    icon: FaShieldAlt, path: "/admin/roles" },
    ]
  }
];

// ===== COMPONENTE DE BIENVENIDA ELIMINADO =====

// ===== COMPONENTE PRINCIPAL =====
const AdminLayoutClean = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [sidebarItems, setSidebarItems] = useState([]);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const userRolId = Number(user.idRol || user.IdRol || 0);

    const checkPermission = (moduleId) => {
      if (isAdmin || userRolId === 1) return true;
      if (!user.permisos || !Array.isArray(user.permisos)) return false;
      
      return user.permisos.some(p => {
        if (typeof p === 'string') {
          const pStr = p.toLowerCase().replace('perm_', '').replace('ver_', '');
          return pStr === moduleId.toLowerCase();
        }
        const mod = String(p.modulo || p.id || p.nombre || "").toLowerCase().replace('perm_', '').replace('ver_', '');
        return mod === moduleId.toLowerCase();
      });
    };

    const buildMenu = () => {
      return menuConfig.map(item => {
        if (item.type === 'link') {
          return checkPermission(item.id) ? item : null;
        }
        
        if (item.type === 'group') {
          const filteredSubItems = item.subItems.filter(sub => checkPermission(sub.id));
          if (filteredSubItems.length > 0) {
            return { ...item, subItems: filteredSubItems };
          }
        }
        return null;
      }).filter(Boolean);
    };

    const finalMenu = buildMenu();
    setSidebarItems(finalMenu);

    // Auto-expandir grupo si un sub-ítem está activo
    const currentPath = location.pathname;
    const groupToExpand = finalMenu.find(item => 
      item.type === 'group' && item.subItems.some(sub => sub.path === currentPath)
    );
    if (groupToExpand) {
      setExpandedGroups(prev => ({ ...prev, [groupToExpand.id]: true }));
    }

  }, [user, isAdmin, location.pathname]);

  // ✅ REDIRECCIÓN INTELIGENTE: Si no tiene dashboard, llevar al primer módulo disponible
  useEffect(() => {
    if (sidebarItems.length > 0) {
      const isTryingBaseRoute = 
        location.pathname === '/admin' || 
        location.pathname === '/admin/';
      
      const hasDashboard = sidebarItems.some(item => 
        item.id === 'dashboard' || (item.subItems && item.subItems.some(s => s.id === 'dashboard'))
      );

      // Si intenta entrar a /admin y tiene dashboard, mandarlo directo al dashboard
      if (isTryingBaseRoute && hasDashboard) {
        console.log("🚀 [REDIR] Mandando al Dashboard inmediatamente...");
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      // Si no tiene dashboard, llevar al primer módulo disponible
      if (isTryingBaseRoute && !hasDashboard) {
        const firstItem = sidebarItems[0];
        const firstPath = firstItem.type === 'link' ? firstItem.path : firstItem.subItems[0].path;
        console.log("🚀 [REDIR] Redirigiendo a primer módulo permitido:", firstPath);
        navigate(firstPath, { replace: true });
      }
    }
  }, [sidebarItems, location.pathname, navigate]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      // Si el grupo ya está abierto, lo cerramos.
      // Si no, abrimos ese grupo y cerramos todos los demás.
      return { [groupId]: !prev[groupId] };
    });
  };

  const handleLogout = () => {
    logout();
  };

  const getUserTypeIcon = () => {
    if (!user) return FaUserCircle;
    const userRolId = Number(user.idRol || user.IdRol || 0);
    if (isAdmin || userRolId === 1) return FaUserTie;
    return FaUserCircle;
  };

  const getUserTypeText = () => {
    if (!user) return 'Usuario';
    const userRole = user.rol || user.Rol || user.rolData?.nombre || 'Personal';
    return userRole;
  };

  const UserIcon = getUserTypeIcon();
  const isBaseAdminRoute = location.pathname === '/admin' || location.pathname === '/admin/';
  return (
    <div className={`al-root ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Botón Hamburguesa (Móvil) */}
      <header className="al-mobile-header">
        <button className="al-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
        <span className="al-mobile-title">StreetCaps</span>
      </header>

      {/* Overlay para móvil */}
      {isSidebarOpen && <div className="al-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      {/* Modal de confirmación de salida */}
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={handleLogout} 
      />

      {/* ===== SIDEBAR ===== */}
      <aside className={`al-sidebar ${isSidebarOpen ? 'mobile-show' : ''}`}>
        {/* Encabezado - Información del Rol */}
        <div className="al-sidebar-header">
          {user && (
              <div className="al-user-info" style={{ gap: '12px' }}>
                <UserIcon size={16} color="#F5C81B" style={{ minWidth: '16px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="al-role-label" style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'none', lineHeight: '1.2', color: '#ffffff' }}>
                    {user?.nombre || user?.Nombre || 'Duvan'}
                  </span>
                  <span className="al-role-label" style={{ fontSize: '0.7rem', color: '#ffffff', textTransform: 'none', opacity: 0.7, fontWeight: '600' }}>
                    {user?.rol || user?.rolData?.nombre || 'Administrador'}
                  </span>
                </div>
              </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="al-nav">
          {sidebarItems.length > 0 ? (
            sidebarItems.map((item) => {
              if (item.type === 'link') {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`al-nav-link${isActive ? ' active' : ''}`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              if (item.type === 'group') {
                const isExpanded = !!expandedGroups[item.id];
                const isAnySubActive = item.subItems.some(sub => location.pathname === sub.path);

                return (
                  <div key={item.id} className={`al-nav-group${isExpanded ? ' open' : ''}`}>
                    <button 
                      className={`al-nav-group-header${isAnySubActive ? ' active' : ''}`}
                      onClick={() => toggleGroup(item.id)}
                    >
                      <item.icon size={16} />
                      <span className="al-group-label">{item.label}</span>
                      <FaChevronDown className="al-chevron" size={12} />
                    </button>
                    
                    <div className="al-nav-sub-items">
                      {item.subItems.map(sub => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link
                            key={sub.id}
                            to={sub.path}
                            className={`al-nav-sub-link${isSubActive ? ' active' : ''}`}
                          >
                            <sub.icon size={12} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <div className="al-no-modules">
              <p>No tiene módulos asignados</p>
              <p>Contacte al administrador</p>
            </div>
          )}
        </nav>

        {/* Botón Cerrar Sesión */}
        <div className="al-logout-area">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="al-logout-btn"
          >
            <FaSignOutAlt size={12} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="al-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayoutClean;
