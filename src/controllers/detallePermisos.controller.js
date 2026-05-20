/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/detallePermisos.controller.js
import DetallePermiso from '../models/detallePermisos.model.js';
import Rol from '../models/roles.model.js';
import Permiso from '../models/permisos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Detalle de Permisos
 */
const detallePermisoController = {
    /**
     * Obtener todos los detalles (con filtros)
     * @route GET /api/detallepermisos
     */
    getAll: async (req, res) => {
        try {
            const { IdRol } = req.query;

            const whereClause = {};
            if (IdRol) {
                whereClause.IdRol = IdRol;
            }

            const detalles = await DetallePermiso.findAll({
                where: whereClause,
                include: [
                    {
                        model: Rol,
                        as: 'Rol',
                        attributes: ['IdRol', 'Nombre']
                    },
                    {
                        model: Permiso,
                        as: 'Permiso',
                        attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                    }
                ],
                order: [['IdRol', 'ASC']]
            });

            return successResponse(res, detalles, 'Detalles obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getAll:', error);
            return errorResponse(res, 'Error al obtener detalles', 500, error.message);
        }
    },

    /**
     * Obtener permisos por rol
     * @route GET /api/detallepermisos/rol/:rolId
     */
    getByRol: async (req, res) => {
        try {
            const { rolId } = req.params;

            const detalles = await DetallePermiso.findAll({
                where: { IdRol: rolId },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                }]
            });

            return successResponse(res, detalles, 'Permisos obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getByRol:', error);
            return errorResponse(res, 'Error al obtener permisos', 500, error.message);
        }
    },

    /**
     * Asignar permisos a un rol (reemplaza todos)
     * @route POST /api/detallepermisos/asignar
     */
    asignar: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdRol, permisos } = req.body;

            if (!IdRol) {
                await transaction.rollback();
                return errorResponse(res, 'Debe especificar el rol', 400);
            }

            if (!permisos || !Array.isArray(permisos)) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de permisos', 400);
            }

            // Eliminar permisos actuales
            await DetallePermiso.destroy({
                where: { IdRol },
                transaction
            });

            // Asignar nuevos permisos
            const asignados = [];
            for (const idPermiso of permisos) {
                const existePermiso = await Permiso.findByPk(idPermiso);
                if (existePermiso) {
                    const nuevo = await DetallePermiso.create({
                        IdRol,
                        IdPermiso: idPermiso
                    }, { transaction });
                    asignados.push(nuevo);
                }
            }

            await transaction.commit();

            return successResponse(res, { 
                asignados: asignados.length,
                totalPermisos: permisos.length
            }, 'Permisos asignados exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en asignar permisos:', error);
            return errorResponse(res, 'Error al asignar permisos', 500, error.message);
        }
    },

    /**
     * Asignar múltiples permisos a un rol
     * @route POST /api/detallepermisos/asignar-multiple
     */
    asignarMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { asignaciones } = req.body;

            if (!asignaciones || !Array.isArray(asignaciones)) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de asignaciones', 400);
            }

            const resultados = [];

            for (const asig of asignaciones) {
                const { IdRol, permisos } = asig;

                // Eliminar permisos actuales del rol
                await DetallePermiso.destroy({
                    where: { IdRol },
                    transaction
                });

                // Asignar nuevos permisos
                for (const idPermiso of permisos) {
                    const existePermiso = await Permiso.findByPk(idPermiso);
                    if (existePermiso) {
                        await DetallePermiso.create({
                            IdRol,
                            IdPermiso: idPermiso
                        }, { transaction });
                    }
                }

                resultados.push({
                    IdRol,
                    permisosAsignados: permisos.length
                });
            }

            await transaction.commit();

            return successResponse(res, resultados, 'Permisos asignados exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en asignarMultiple:', error);
            return errorResponse(res, 'Error al asignar permisos', 500, error.message);
        }
    },

    /**
     * Quitar un permiso de un rol
     * @route DELETE /api/detallepermisos/:id
     */
    remove: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            const detalle = await DetallePermiso.findByPk(id);
            if (!detalle) {
                await transaction.rollback();
                return errorResponse(res, 'Registro no encontrado', 404);
            }

            await detalle.destroy({ transaction });
            await transaction.commit();

            return successResponse(res, null, 'Permiso removido exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en remove permiso:', error);
            return errorResponse(res, 'Error al remover permiso', 500, error.message);
        }
    },

    /**
     * Quitar múltiples permisos de un rol
     * @route POST /api/detallepermisos/quitar-multiple
     */
    quitarMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdRol, permisos } = req.body;

            if (!IdRol) {
                await transaction.rollback();
                return errorResponse(res, 'Debe especificar el rol', 400);
            }

            if (!permisos || !Array.isArray(permisos)) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de permisos', 400);
            }

            const eliminados = await DetallePermiso.destroy({
                where: {
                    IdRol,
                    IdPermiso: permisos
                },
                transaction
            });

            await transaction.commit();

            return successResponse(res, { eliminados }, 'Permisos removidos exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en quitarMultiple:', error);
            return errorResponse(res, 'Error al remover permisos', 500, error.message);
        }
    },

    /**
     * Sincronizar permisos de un rol (reemplaza todos)
     * @route PUT /api/detallepermisos/rol/:rolId/sincronizar
     */
    sincronizar: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { rolId } = req.params;
            const { permisos } = req.body;

            // Verificar que el rol existe
            const rol = await Rol.findByPk(rolId);
            if (!rol) {
                await transaction.rollback();
                return errorResponse(res, 'Rol no encontrado', 404);
            }

            // Eliminar permisos actuales
            await DetallePermiso.destroy({
                where: { IdRol: rolId },
                transaction
            });

            // Asignar nuevos permisos
            for (const idPermiso of permisos) {
                await DetallePermiso.create({
                    IdRol: rolId,
                    IdPermiso: idPermiso
                }, { transaction });
            }

            // Actualizar el campo Permisos en el rol (cache)
            await rol.update({ Permisos: permisos }, { transaction });

            await transaction.commit();

            return successResponse(res, { 
                IdRol: rolId,
                permisosAsignados: permisos.length 
            }, 'Permisos sincronizados exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en sincronizar:', error);
            return errorResponse(res, 'Error al sincronizar permisos', 500, error.message);
        }
    },

    /**
     * Verificar si un rol tiene un permiso específico
     * @route GET /api/detallepermisos/verificar
     */
    verificar: async (req, res) => {
        try {
            const { IdRol, IdPermiso } = req.query;

            if (!IdRol || !IdPermiso) {
                return errorResponse(res, 'Debe proporcionar IdRol e IdPermiso', 400);
            }

            const existe = await DetallePermiso.findOne({
                where: { IdRol, IdPermiso }
            });

            return successResponse(res, { tienePermiso: !!existe }, 'Verificación completada');

        } catch (error) {
            console.error('❌ Error en verificar permiso:', error);
            return errorResponse(res, 'Error al verificar permiso', 500, error.message);
        }
    },

    /**
     * Obtener permisos no asignados a un rol
     * @route GET /api/detallepermisos/rol/:rolId/disponibles
     */
    getPermisosDisponibles: async (req, res) => {
        try {
            const { rolId } = req.params;

            // Obtener todos los permisos
            const todosPermisos = await Permiso.findAll({
                attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
            });

            // Obtener permisos asignados al rol
            const asignados = await DetallePermiso.findAll({
                where: { IdRol: rolId },
                attributes: ['IdPermiso']
            });

            const idsAsignados = asignados.map(a => a.IdPermiso);

            // Filtrar permisos no asignados
            const disponibles = todosPermisos.filter(p => !idsAsignados.includes(p.IdPermiso));

            return successResponse(res, disponibles, 'Permisos disponibles obtenidos');

        } catch (error) {
            console.error('❌ Error en getPermisosDisponibles:', error);
            return errorResponse(res, 'Error al obtener permisos disponibles', 500, error.message);
        }
    }
};

export default detallePermisoController;    