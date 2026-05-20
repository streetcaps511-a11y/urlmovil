// middlewares/role.middleware.js
const { errorResponse } = require('../utils/response');

/**
 * Middleware para verificar roles
 * @param {Array} rolesPermitidos - Array de roles permitidos
 */
const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return errorResponse(res, 'Usuario no autenticado', 401);
        }

        // Obtener rol del usuario (asumiendo que viene en req.usuario.rol)
        const usuarioRol = req.usuario.rol || req.usuario.Rol?.Nombre;

        if (!usuarioRol) {
            return errorResponse(res, 'Rol de usuario no definido', 403);
        }

        if (!rolesPermitidos.includes(usuarioRol)) {
            return errorResponse(res, 'No tiene permisos para realizar esta acción', 403);
        }

        next();
    };
};

/**
 * Middleware para verificar permisos específicos
 * @param {String} permisoId - ID del permiso requerido
 */
const checkPermission = (permisoId) => {
    return async (req, res, next) => {
        try {
            if (!req.usuario) {
                return errorResponse(res, 'Usuario no autenticado', 401);
            }

            const DetallePermiso = require('../models/DetallePermisos');
            
            const tienePermiso = await DetallePermiso.findOne({
                where: {
                    IdRol: req.usuario.IdRol,
                    IdPermiso: permisoId
                }
            });

            if (!tienePermiso) {
                return errorResponse(res, 'No tiene el permiso requerido', 403);
            }

            next();

        } catch (error) {
            console.error('❌ Error en checkPermission:', error);
            return errorResponse(res, 'Error al verificar permisos', 500);
        }
    };
};

module.exports = { checkRole, checkPermission };