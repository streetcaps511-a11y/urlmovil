/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/permisos.controller.js
import { Op } from 'sequelize';
import Permiso from '../models/permisos.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import { sequelize } from '../config/db.js';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';

/**
 * Controlador de Permisos
 * Maneja todas las operaciones para permisos
 */
const permisoController = {
    /**
     * Obtener todos los permisos agrupados por módulo
     * @route GET /api/permisos
     */
    getAllPermisos: async (req, res) => {
        try {
            const { modulo } = req.query;

            const whereClause = {};
            if (modulo) {
                whereClause.Modulo = modulo;
            }

            const permisos = await Permiso.findAll({
                where: whereClause,
                order: [['Modulo', 'ASC'], ['IdPermiso', 'ASC']]
            });

            // Agrupar por módulo
            const permisosPorModulo = {};
            
            // Si hay filtro por módulo, solo agrupar ese módulo
            if (modulo) {
                permisosPorModulo[modulo] = permisos.map(p => ({
                    IdPermiso: p.IdPermiso,
                    Nombre: p.Nombre,
                    Accion: p.Accion
                }));
            } else {
                const modulos = [
                    'Dashboard', 'Categorías', 'Productos', 'Proveedores',
                    'Compras', 'Clientes', 'Ventas', 'Devoluciones',
                    'Usuarios', 'Roles', 'Permisos'
                ];

                modulos.forEach(mod => {
                    permisosPorModulo[mod] = permisos
                        .filter(p => p.Modulo === mod)
                        .map(p => ({
                            IdPermiso: p.IdPermiso,
                            Nombre: p.Nombre,
                            Accion: p.Accion
                        }));
                });
            }

            res.status(200).json({
                success: true,
                data: permisosPorModulo,
                message: 'Permisos obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllPermisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los permisos',
                error: error.message
            });
        }
    },

    /**
     * Obtener permiso por ID
     * @route GET /api/permisos/:id
     */
    getPermisoById: async (req, res) => {
        try {
            const { id } = req.params;

            const permiso = await Permiso.findByPk(id);

            if (!permiso) {
                return res.status(404).json({
                    success: false,
                    message: 'Permiso no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                data: permiso,
                message: 'Permiso obtenido exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getPermisoById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener permiso',
                error: error.message
            });
        }
    },

    /**
     * Obtener permisos por módulo
     * @route GET /api/permisos/modulo/:modulo
     */
    getPermisosByModulo: async (req, res) => {
        try {
            const { modulo } = req.params;

            const permisos = await Permiso.findAll({
                where: { Modulo: modulo },
                order: [['IdPermiso', 'ASC']]
            });

            res.status(200).json({
                success: true,
                data: permisos,
                message: 'Permisos del módulo obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getPermisosByModulo:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener permisos del módulo',
                error: error.message
            });
        }
    },

    /**
     * Obtener permisos de un rol específico
     * @route GET /api/permisos/rol/:rolId
     */
    getPermisosByRol: async (req, res) => {
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

            const permisosFormateados = detalles.map(p => ({
                IdPermiso: p.IdPermiso,
                Nombre: p.Permiso?.Nombre,
                Modulo: p.Permiso?.Modulo,
                Accion: p.Permiso?.Accion
            }));

            res.status(200).json({
                success: true,
                data: permisosFormateados,
                message: 'Permisos del rol obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getPermisosByRol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener permisos del rol',
                error: error.message
            });
        }
    },

    /**
     * Crear nuevo permiso
     * @route POST /api/permisos
     */
    createPermiso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdPermiso, Nombre, Modulo, Accion } = req.body;

            // Validar que el ID del permiso tenga el formato correcto (ej: ver_usuarios)
            const idPattern = /^[a-z_]+$/;
            if (!idPattern.test(IdPermiso)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El ID del permiso debe contener solo minúsculas y guiones bajos'
                });
            }

            const nuevoPermiso = await Permiso.create({
                IdPermiso,
                Nombre,
                Modulo,
                Accion
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoPermiso,
                message: 'Permiso creado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createPermiso:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del permiso ya existe'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al crear permiso',
                error: error.message
            });
        }
    },

    /**
     * Actualizar permiso
     * @route PUT /api/permisos/:id
     */
    updatePermiso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { Nombre, Modulo, Accion } = req.body;

            const permiso = await Permiso.findByPk(id);
            
            if (!permiso) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Permiso no encontrado'
                });
            }

            await permiso.update({
                Nombre,
                Modulo,
                Accion
            }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                data: permiso,
                message: 'Permiso actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updatePermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar permiso',
                error: error.message
            });
        }
    },

    /**
     * Eliminar permiso
     * @route DELETE /api/permisos/:id
     */
    deletePermiso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            // Verificar si el permiso está siendo usado por algún rol
            const enUso = await DetallePermiso.count({
                where: { IdPermiso: id }
            });

            if (enUso > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar el permiso porque está siendo usado por ${enUso} rol(es)`
                });
            }

            const permiso = await Permiso.findByPk(id);
            
            if (!permiso) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Permiso no encontrado'
                });
            }

            await permiso.destroy({ transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Permiso eliminado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deletePermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar permiso',
                error: error.message
            });
        }
    },

    /**
     * Inicializar permisos por defecto (ejecutar una vez)
     * @route POST /api/permisos/init
     */
    initPermisos: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            // Definir permisos por módulo (ampliado)
            const permisosDefecto = [
                // Dashboard
                { IdPermiso: 'ver_dashboard', Nombre: 'Ver Dashboard', Modulo: 'Dashboard', Accion: 'ver' },
                
                // Categorías
                { IdPermiso: 'ver_categorias', Nombre: 'Ver Categorías', Modulo: 'Categorías', Accion: 'ver' },
                { IdPermiso: 'crear_categorias', Nombre: 'Crear Categorías', Modulo: 'Categorías', Accion: 'crear' },
                { IdPermiso: 'editar_categorias', Nombre: 'Editar Categorías', Modulo: 'Categorías', Accion: 'editar' },
                { IdPermiso: 'eliminar_categorias', Nombre: 'Eliminar Categorías', Modulo: 'Categorías', Accion: 'eliminar' },
                { IdPermiso: 'activar_categorias', Nombre: 'Activar/Desactivar Categorías', Modulo: 'Categorías', Accion: 'activar' },
                
                // Productos
                { IdPermiso: 'ver_productos', Nombre: 'Ver Productos', Modulo: 'Productos', Accion: 'ver' },
                { IdPermiso: 'crear_productos', Nombre: 'Crear Productos', Modulo: 'Productos', Accion: 'crear' },
                { IdPermiso: 'editar_productos', Nombre: 'Editar Productos', Modulo: 'Productos', Accion: 'editar' },
                { IdPermiso: 'eliminar_productos', Nombre: 'Eliminar Productos', Modulo: 'Productos', Accion: 'eliminar' },
                { IdPermiso: 'activar_productos', Nombre: 'Activar/Desactivar Productos', Modulo: 'Productos', Accion: 'activar' },
                
                // Proveedores
                { IdPermiso: 'ver_proveedores', Nombre: 'Ver Proveedores', Modulo: 'Proveedores', Accion: 'ver' },
                { IdPermiso: 'crear_proveedores', Nombre: 'Crear Proveedores', Modulo: 'Proveedores', Accion: 'crear' },
                { IdPermiso: 'editar_proveedores', Nombre: 'Editar Proveedores', Modulo: 'Proveedores', Accion: 'editar' },
                { IdPermiso: 'eliminar_proveedores', Nombre: 'Eliminar Proveedores', Modulo: 'Proveedores', Accion: 'eliminar' },
                { IdPermiso: 'activar_proveedores', Nombre: 'Activar/Desactivar Proveedores', Modulo: 'Proveedores', Accion: 'activar' },
                
                // Compras
                { IdPermiso: 'ver_compras', Nombre: 'Ver Compras', Modulo: 'Compras', Accion: 'ver' },
                { IdPermiso: 'crear_compras', Nombre: 'Crear Compras', Modulo: 'Compras', Accion: 'crear' },
                { IdPermiso: 'editar_compras', Nombre: 'Editar Compras', Modulo: 'Compras', Accion: 'editar' },
                { IdPermiso: 'anular_compras', Nombre: 'Anular Compras', Modulo: 'Compras', Accion: 'anular' },
                { IdPermiso: 'eliminar_compras', Nombre: 'Eliminar Compras', Modulo: 'Compras', Accion: 'eliminar' },
                
                // Clientes
                { IdPermiso: 'ver_clientes', Nombre: 'Ver Clientes', Modulo: 'Clientes', Accion: 'ver' },
                { IdPermiso: 'crear_clientes', Nombre: 'Crear Clientes', Modulo: 'Clientes', Accion: 'crear' },
                { IdPermiso: 'editar_clientes', Nombre: 'Editar Clientes', Modulo: 'Clientes', Accion: 'editar' },
                { IdPermiso: 'eliminar_clientes', Nombre: 'Eliminar Clientes', Modulo: 'Clientes', Accion: 'eliminar' },
                { IdPermiso: 'activar_clientes', Nombre: 'Activar/Desactivar Clientes', Modulo: 'Clientes', Accion: 'activar' },
                
                // Ventas
                { IdPermiso: 'ver_ventas', Nombre: 'Ver Ventas', Modulo: 'Ventas', Accion: 'ver' },
                { IdPermiso: 'crear_ventas', Nombre: 'Crear Ventas', Modulo: 'Ventas', Accion: 'crear' },
                { IdPermiso: 'editar_ventas', Nombre: 'Editar Ventas', Modulo: 'Ventas', Accion: 'editar' },
                { IdPermiso: 'anular_ventas', Nombre: 'Anular Ventas', Modulo: 'Ventas', Accion: 'anular' },
                
                // Devoluciones
                { IdPermiso: 'ver_devoluciones', Nombre: 'Ver Devoluciones', Modulo: 'Devoluciones', Accion: 'ver' },
                { IdPermiso: 'crear_devoluciones', Nombre: 'Crear Devoluciones', Modulo: 'Devoluciones', Accion: 'crear' },
                { IdPermiso: 'editar_devoluciones', Nombre: 'Editar Devoluciones', Modulo: 'Devoluciones', Accion: 'editar' },
                { IdPermiso: 'anular_devoluciones', Nombre: 'Anular Devoluciones', Modulo: 'Devoluciones', Accion: 'anular' },
                { IdPermiso: 'procesar_devoluciones', Nombre: 'Procesar Devoluciones', Modulo: 'Devoluciones', Accion: 'procesar' },
                
                // Usuarios
                { IdPermiso: 'ver_usuarios', Nombre: 'Ver Usuarios', Modulo: 'Usuarios', Accion: 'ver' },
                { IdPermiso: 'crear_usuarios', Nombre: 'Crear Usuarios', Modulo: 'Usuarios', Accion: 'crear' },
                { IdPermiso: 'editar_usuarios', Nombre: 'Editar Usuarios', Modulo: 'Usuarios', Accion: 'editar' },
                { IdPermiso: 'eliminar_usuarios', Nombre: 'Eliminar Usuarios', Modulo: 'Usuarios', Accion: 'eliminar' },
                { IdPermiso: 'activar_usuarios', Nombre: 'Activar/Desactivar Usuarios', Modulo: 'Usuarios', Accion: 'activar' },
                { IdPermiso: 'aprobar_usuarios', Nombre: 'Aprobar Usuarios', Modulo: 'Usuarios', Accion: 'aprobar' },
                
                // Roles
                { IdPermiso: 'ver_roles', Nombre: 'Ver Roles', Modulo: 'Roles', Accion: 'ver' },
                { IdPermiso: 'crear_roles', Nombre: 'Crear Roles', Modulo: 'Roles', Accion: 'crear' },
                { IdPermiso: 'editar_roles', Nombre: 'Editar Roles', Modulo: 'Roles', Accion: 'editar' },
                { IdPermiso: 'eliminar_roles', Nombre: 'Eliminar Roles', Modulo: 'Roles', Accion: 'eliminar' },
                { IdPermiso: 'activar_roles', Nombre: 'Activar/Desactivar Roles', Modulo: 'Roles', Accion: 'activar' },
                { IdPermiso: 'asignar_permisos', Nombre: 'Asignar Permisos a Roles', Modulo: 'Roles', Accion: 'asignar' },
                
                // Permisos
                { IdPermiso: 'ver_permisos', Nombre: 'Ver Permisos', Modulo: 'Permisos', Accion: 'ver' },
                { IdPermiso: 'crear_permisos', Nombre: 'Crear Permisos', Modulo: 'Permisos', Accion: 'crear' },
                { IdPermiso: 'editar_permisos', Nombre: 'Editar Permisos', Modulo: 'Permisos', Accion: 'editar' },
                { IdPermiso: 'eliminar_permisos', Nombre: 'Eliminar Permisos', Modulo: 'Permisos', Accion: 'eliminar' },
                { IdPermiso: 'inicializar_permisos', Nombre: 'Inicializar Permisos', Modulo: 'Permisos', Accion: 'inicializar' },
                
                // Estados
                { IdPermiso: 'ver_estados', Nombre: 'Ver Estados', Modulo: 'Estados', Accion: 'ver' },
                { IdPermiso: 'crear_estados', Nombre: 'Crear Estados', Modulo: 'Estados', Accion: 'crear' },
                { IdPermiso: 'editar_estados', Nombre: 'Editar Estados', Modulo: 'Estados', Accion: 'editar' },
                { IdPermiso: 'eliminar_estados', Nombre: 'Eliminar Estados', Modulo: 'Estados', Accion: 'eliminar' },
                { IdPermiso: 'activar_estados', Nombre: 'Activar/Desactivar Estados', Modulo: 'Estados', Accion: 'activar' },
                
                // Tallas
                { IdPermiso: 'ver_tallas', Nombre: 'Ver Tallas', Modulo: 'Tallas', Accion: 'ver' },
                { IdPermiso: 'crear_tallas', Nombre: 'Crear Tallas', Modulo: 'Tallas', Accion: 'crear' },
                { IdPermiso: 'editar_tallas', Nombre: 'Editar Tallas', Modulo: 'Tallas', Accion: 'editar' },
                { IdPermiso: 'eliminar_tallas', Nombre: 'Eliminar Tallas', Modulo: 'Tallas', Accion: 'eliminar' },
                { IdPermiso: 'activar_tallas', Nombre: 'Activar/Desactivar Tallas', Modulo: 'Tallas', Accion: 'activar' },
                
                // Imágenes
                { IdPermiso: 'ver_imagenes', Nombre: 'Ver Imágenes', Modulo: 'Imágenes', Accion: 'ver' },
                { IdPermiso: 'crear_imagenes', Nombre: 'Crear Imágenes', Modulo: 'Imágenes', Accion: 'crear' },
                { IdPermiso: 'editar_imagenes', Nombre: 'Editar Imágenes', Modulo: 'Imágenes', Accion: 'editar' },
                { IdPermiso: 'eliminar_imagenes', Nombre: 'Eliminar Imágenes', Modulo: 'Imágenes', Accion: 'eliminar' }
            ];

            let creados = 0;
            let existentes = 0;

            for (const permiso of permisosDefecto) {
                const [permisoCreado, created] = await Permiso.findOrCreate({
                    where: { IdPermiso: permiso.IdPermiso },
                    defaults: permiso,
                    transaction
                });
                
                if (created) {
                    creados++;
                } else {
                    existentes++;
                }
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Permisos inicializados exitosamente',
                data: { 
                    creados, 
                    existentes,
                    total: permisosDefecto.length 
                }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en initPermisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al inicializar permisos',
                error: error.message
            });
        }
    },

    /**
     * Verificar si un usuario tiene un permiso específico
     * @route GET /api/permisos/verificar
     */
    verificarPermiso: async (req, res) => {
        try {
            const { usuarioId, permisoId } = req.query;

            if (!usuarioId || !permisoId) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar usuarioId y permisoId'
                });
            }

            const usuario = await Usuario.findByPk(usuarioId, {
                include: [{ model: Rol, as: 'Rol' }]
            });
            
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Si es admin, tiene todos los permisos
            if (usuario.Tipo === 'admin') {
                return res.status(200).json({
                    success: true,
                    data: {
                        usuarioId,
                        permisoId,
                        tienePermiso: true,
                        esAdmin: true
                    },
                    message: 'Verificación completada'
                });
            }

            const tienePermiso = await DetallePermiso.findOne({
                where: {
                    IdRol: usuario.IdRol,
                    IdPermiso: permisoId
                }
            });

            res.status(200).json({
                success: true,
                data: {
                    usuarioId,
                    permisoId,
                    tienePermiso: !!tienePermiso,
                    rol: usuario.Rol?.Nombre
                },
                message: 'Verificación completada'
            });

        } catch (error) {
            console.error('❌ Error en verificarPermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar permiso',
                error: error.message
            });
        }
    }
};

export default permisoController;