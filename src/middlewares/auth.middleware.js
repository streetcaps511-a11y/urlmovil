import { Usuario, Rol, DetallePermiso, Permiso, Cliente } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { verifyToken as verifyJwt } from '../utils/jwt.js';
import fs from 'fs';
import { Op } from 'sequelize';

/**
 * Verificar token JWT
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔧 FIX: Manejar tanto "Bearer token" como solo "token"
    let token = null;

    if (!authHeader) {
      console.error('❌ No se encontró el header Authorization');
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    // Si el header empieza con "Bearer ", quitarlo
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Quita "Bearer "
    } else {
      // Si no, usar el header completo (Postman lo envía así desde la pestaña Authorization)
      token = authHeader.trim();
    }

    // Debug (Desactivado para limpiar terminal)
    // console.log('🔍 Header Authorization:', authHeader?.substring(0, 30) + '...');
    // console.log('🔍 Token extraído (primeros 30 chars):', token?.substring(0, 30) + '...');
    // console.log('🔍 Longitud del token:', token?.length);

    if (!token || token.length < 20) {
      console.error('❌ Token inválido o demasiado corto:', token);
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación válido'
      });
    }

    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (jwtError) {
      console.error('❌ Error específico en verifyJwt:', jwtError.name, '-', jwtError.message);
      throw jwtError; // Relanzar para que lo capture el catch exterior
    }

    // Verificar estado desde el token primero (más rápido)
    if (decoded.estado === 'inactivo') {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    if (decoded.estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: 'Usuario pendiente de aprobación',
        redirectTo: '/pendiente-aprobacion'
      });
    }

    // 🔍 Buscar usuario por el ID del token (usando IdUsuario que es la PK)
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [
        {
          model: Rol,
          as: 'rolData'
        },
        {
          model: Cliente,
          as: 'clienteData',
          attributes: ['id', 'direccion', 'ciudad', 'departamento', 'avatarUrl']
        }
      ]
    });

    if (!usuario) {
      console.log(`❌ Auth error: El usuario con ID ${decoded.id} no existe en la base de datos`);
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado en el sistema'
      });
    }

    // Verificar estado (Soportando "true", true o "activo")
    const isActive = usuario.estado === 'activo' || usuario.estado === 'true' || usuario.estado === true;
    if (usuario.estado === 'inactivo' || (!isActive && usuario.estado !== 'pendiente')) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Usuario inactivo'
      });
    }

    if (usuario.estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: 'Usuario pendiente de aprobación',
        redirectTo: '/pendiente-aprobacion'
      });
    }

    // 🔍 BLOQUEO DE DOBLE ACCESO: Validar SessionId según plataforma
    const platform = decoded.platform || 'web';
    const dbSessionId = platform === 'app' ? usuario.sessionIdApp : usuario.sessionId;

    if (dbSessionId && decoded.sessionId !== dbSessionId) {
      console.log(`⚠️ Sesión invalidada para ${usuario.email} en ${platform}: El ID del token no coincide.`);
      return res.status(401).json({
        success: false,
        isSessionInvalidated: true,
        message: `Tu sesión ha sido abierta en otro ${platform === 'app' ? 'dispositivo (App)' : 'navegador (Web)'}.`
      });
    }

    // Actualizar última actividad para mantener la sesión viva
    if (platform === 'app') {
      usuario.lastActivityApp = new Date();
    } else {
      usuario.lastActivity = new Date();
    }
    await usuario.save({ hooks: false });

    // ✅ Inyectar para que el controlador lo reciba directamente
    req.usuario = usuario;
    req.platform = platform; 
    req.rol = usuario.rolData;
    req.usuarioId = usuario.id;

    // 🛡️ REFUERZO DE PERMISOS PARA ADMIN (Si el JSON está vacío)
    const userRolId = Number(usuario.idRol || usuario.IdRol || 0);
    if (userRolId === 1 && (!req.rol.permisos || req.rol.permisos.length === 0)) {
       req.rol.permisos = [
         'dashboard', 'productos', 'categorias', 'proveedores', 'compras', 
         'clientes', 'ventas', 'devoluciones', 'usuarios', 'roles', 'estados'
       ];
    }

    // console.log(`✅ Token verificado: ${usuario.email}. Rol: ${req.rol?.nombre} (ID: ${req.rol?.id})`);
    next();

  } catch (error) {
    console.error('❌ Error en verifyToken:', error.name, '-', error.message);
    return res.status(401).json({
      success: false,
      message: error.name === 'JsonWebTokenError' ? 'Token malformado o inválido' :
        error.name === 'TokenExpiredError' ? 'Token expirado' :
          'Token inválido o expirado'
    });
  }
};

/**
 * Verificar rol de usuario
 */
export const checkRole = (rolesPermitidos) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // ADMIN siempre tiene acceso (agregamos ADMINISTRADOR y soporte case-insensitive)
      const rolName = String(req.rol?.nombre || '').toUpperCase();
      if (rolName === 'ADMINISTRADOR' || rolName === 'ADMIN') {
        return next();
      }

      const rol = await Rol.findByPk(req.usuario.idRol);

      if (!rol) {
        return res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      if (!rolesPermitidos.includes(rol.nombre)) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos de ${rolesPermitidos.join(' o ')}`
        });
      }

      next();

    } catch (error) {
      console.error('Error en checkRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar rol'
      });
    }
  };
};

/**
 * Verificar permisos específicos
 */
export const checkPermission = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      // 🔍 DATOS PARA DEBUG
      const userEmail = req.usuario.email;
      const userRolId = Number(req.usuario.idRol || req.usuario.IdRol || 0);
      const rolName = String(req.rol?.nombre || '').toUpperCase().trim();
      const permsToCheck = Array.isArray(permisoRequerido) ? permisoRequerido : [permisoRequerido];
      
      // console.log(`🛡️ [DEBUG AUTH] User: ${userEmail}, RolID: ${userRolId}, Needed (any): ${permsToCheck.join(', ')}`);

      // 🚀 1. ADMIN SIEMPRE TIENE ACCESO
      // Bypass para roles administrativos conocidos (ADMIN, ADMINISTRADOR)
      const isAdminRole = rolName.includes('ADMIN');
      const isSystemAdmin = userRolId === 1;

      if (isAdminRole || isSystemAdmin) {
        // console.log(`✅ [DEBUG AUTH] ACCESO CONCEDIDO: Administrador (${rolName})`);
        return next();
      }

      // 📦 2. VERIFICAR EN PERMISOS JSON (Campo 'permisos' en la tabla Roles)
      const rolJsonPerms = req.rol?.permisos || [];
      const hasInJson = permsToCheck.some(reqPerm => {
          const normalizedReq = reqPerm.toLowerCase().replace('ver_', '').replace('perm_', '');
          return Array.isArray(rolJsonPerms) && rolJsonPerms.some(p => {
            const pStr = String(p).toLowerCase().replace('ver_', '').replace('perm_', '');
            return pStr === normalizedReq || pStr === reqPerm.toLowerCase();
          });
      });

      if (hasInJson) {
        // console.log(`✅ [DEBUG AUTH] ACCESO CONCEDIDO: Permiso encontrado en JSON del Rol`);
        return next();
      }

      // 🔗 3. VERIFICAR EN TABLA RELACIONAL (DetallePermisos)
      // Construir lista de todas las variantes posibles para los permisos solicitados
      const allVariations = [];
      permsToCheck.forEach(reqPerm => {
          const normalized = String(reqPerm).toLowerCase().replace('ver_', '').replace('perm_', '').trim();
          allVariations.push(
            reqPerm, 
            `perm_${normalized}`, 
            `ver_${normalized}`, 
            normalized, 
            reqPerm.toLowerCase(), 
            reqPerm.toUpperCase(),
            `ver_${reqPerm.toLowerCase()}`
          );
      });

      const uniqueVariations = [...new Set(allVariations.filter(v => v && typeof v === 'string'))];

      const tienePermisoRelacional = await DetallePermiso.findOne({
        where: {
          idRol: userRolId,
          idPermiso: { [Op.in]: uniqueVariations }
        }
      });

      if (tienePermisoRelacional) {
        // console.log(`✅ [DEBUG AUTH] ACCESO CONCEDIDO: Permiso '${tienePermisoRelacional.idPermiso}' encontrado en DetallePermisos`);
        return next();
      }

      // ❌ ACCESO DENEGADO
      // console.log(`❌ [DEBUG AUTH] ACCESO DENEGADO para ${userEmail}. Faltan permisos: ${permsToCheck.join(', ')}`);
      
      try { 
        fs.appendFileSync('errors.log', `[${new Date().toISOString()}] 403 FORBIDDEN: ${userEmail} MISSES '${permsToCheck.join('|')}' (RolID: ${userRolId})\n`); 
      } catch(e){}

      return res.status(403).json({
        success: false,
        message: `No tiene permiso para realizar esta acción. Se requiere uno de: ${permsToCheck.join(', ')}`,
        debug: { user: userEmail, rolId: userRolId, missing: permsToCheck }
      });

    } catch (error) {
      console.error('🔴 Error crítico en checkPermission:', error);
      return res.status(500).json({ success: false, message: 'Error interno al verificar permisos', error: error.message });
    }
  };
};

/**
 * Verificar si el usuario puede modificar datos de clientes
 */
export const checkClienteAccess = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Admin puede acceder a cualquier cliente
    if (req.rol?.nombre === 'Administrador' || req.rol?.nombre === 'ADMIN') {
      return next();
    }

    // Cliente solo puede acceder a sus propios datos
    if (req.rol?.nombre === 'Usuario' || req.rol?.nombre === 'Cliente') {
      const clienteId = parseInt(req.params.id);
      if (clienteId === req.usuario.id) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'No puede acceder a datos de otro cliente'
      });
    }

    // Empleados con permisos pueden acceder
    next();

  } catch (error) {
    console.error('Error en checkClienteAccess:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar acceso'
    });
  }
};

// Exportación por defecto para compatibilidad
export default {
  verifyToken,
  checkRole,
  checkPermission,
  checkClienteAccess
};