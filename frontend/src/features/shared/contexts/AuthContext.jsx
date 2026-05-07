// src/features/shared/contexts/AuthContext.jsx

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { verifyUserToken } from "../../auth/services/authApi";
import api from "../services/api";
import SessionConflictModal from "../components/SessionConflictModal";
import { NitroCache } from "../utils/NitroCache";

import { fetchDashboardStats } from "../../admin/dashboard/services/dashboardApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ⚡ SI YA HAY USUARIO, NO BLOQUEAMOS LA CARGA INICIAL
  const [loading, setLoading] = useState(!sessionStorage.getItem("user"));
  const [sessionConflict, setSessionConflict] = useState(false); // 🔑 Restaurado

  // ✅ useCallback para evitar re-creación de funciones
  const login = useCallback((userData) => {
    if (!userData) return;
    
    // 🔥 SOLUCIÓN FINAL: "Aplanar" el objeto usuario para que todos los datos clave (como IdCliente y direccion) estén en la raíz
    let finalUser = { ...userData };
    
    // Aplanar 'usuario'
    if (userData.usuario) {
      finalUser = { ...finalUser, ...userData.usuario };
    }
    
    // Aplanar 'clienteData' (Aquí vive el IdCliente del cliente real)
    if (userData.clienteData) {
      finalUser = { ...finalUser, ...userData.clienteData };
    }
    
    // Si todavía hay campos anidados, traerlos a la raíz
    if (finalUser.usuario) delete finalUser.usuario;
    if (finalUser.clienteData) delete finalUser.clienteData;
    
    sessionStorage.setItem("user", JSON.stringify(finalUser));
    if (userData.token) {
      sessionStorage.setItem("token", userData.token);
    }
    if (userData.refreshToken) {
      sessionStorage.setItem("refreshToken", userData.refreshToken);
    }
    
    setUser(finalUser);
  }, []);

  const updateUser = useCallback((newData) => {
    setUser(prev => {
      if (!prev) return (newData && newData.id) ? newData : null;
      
      // ✅ Fusión inteligente para no perder permisos ni campos críticos
      let updated = { 
        ...prev, 
        ...newData,
        permisos: newData.permisos !== undefined ? newData.permisos : (prev.permisos || []),
        mustChangePassword: newData.mustChangePassword !== undefined ? newData.mustChangePassword : prev.mustChangePassword,
        rol: newData.rol || prev.rol || 'Usuario',
        idRol: newData.idRol || prev.idRol || newData.IdRol || prev.IdRol
      };

      // 🛡️ REFUERZO FRONTEND: Si es admin (ID 1) y no tiene permisos, inyectar básicos para que no se bloquee la UI
      if (updated.idRol === 1 && (!updated.permisos || updated.permisos.length === 0)) {
         updated.permisos = ['dashboard', 'productos', 'categorias', 'proveedores', 'compras', 'clientes', 'ventas', 'devoluciones', 'usuarios', 'roles'];
      }
      
      sessionStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(async (reason = 'Manual') => {
    console.warn(`🚀 Cerrando sesión... Motivo: ${reason}`);
    
    // 🚪 Notificar al servidor (esperar confirmación para evitar sesiones colgadas)
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        // Usamos un timeout corto para no bloquear al usuario si el servidor no responde
        await api.post('/api/auth/logout', {}, { timeout: 3000 });
      }
    } catch (err) {
      console.warn("⚠️ Error al notificar logout al servidor:", err.message);
    }

    // 🧹 Limpieza inmediata (Pase lo que pase con el servidor)
    NitroCache.clear();
    setUser(null);
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refreshToken");
    
    // 🏠 Redirección instantánea al Home
    navigate('/');
  }, [navigate]);

  // ✅ isAdmin como memoized value
  // Solo para administrador global (Bypass total de permisos)
  const isAdmin = React.useMemo(() => {
    if (!user) return false;
    const userRolId = Number(user.idRol || user.IdRol || 0);
    const rolName = String(user.rol || user.rolData?.nombre || "").toUpperCase().trim();
    return (userRolId === 1 || rolName === 'ADMINISTRADOR' || rolName === 'ADMIN');
  }, [user]);

  // Para permitir acceso al panel administrativo (incluye trabajadores con permisos limitados)
  const isStaff = React.useMemo(() => {
    if (!user) return false;
    return user.userType === "admin" || isAdmin;
  }, [user, isAdmin]);



  // ✅ Sincronizar el perfil en segundo plano (SIN bloquear la UI)
  const syncProfile = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await verifyUserToken();
      if (response.success && response.usuario) {
        updateUser(response.usuario);
      }
    } catch (error) {
      // Si falla por 401, el interceptor de Axios ya maneja el logout/conflicto
      console.error("❌ [AUTH/SILENT] Error en sincronización:", error);
    } finally {
      // Siempre quitamos el loading inicial si existía
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    // Solo sincronizar si hay un token
    if (sessionStorage.getItem("token")) {
      // ⚡ SILENCIOSO: Sincronizar en segundo plano sin bloquear el render inicial
      syncProfile();
    } else {
      setLoading(false);
    }

    // ⚡ Detección instantánea al cambiar pestaña
    const handleVisibility = () => {
      const token = sessionStorage.getItem("token");
      if (!document.hidden && token) {
        syncProfile();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncProfile]);

  // ✅ Exponer logout globalmente y escuchar conflictos
  React.useEffect(() => {
    const handleConflict = () => setSessionConflict(true);
    window.addEventListener('session-conflict', handleConflict);

    window.logoutApp = logout;
    return () => { 
      window.removeEventListener('session-conflict', handleConflict);
      delete window.logoutApp; 
    };
  }, [logout]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#000',
        color: '#F5C81B'
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAdmin, isStaff, loading }}>
      {sessionConflict && <SessionConflictModal />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};