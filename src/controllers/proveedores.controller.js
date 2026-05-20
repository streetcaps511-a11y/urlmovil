/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/proveedores.controller.js
import { Op } from 'sequelize';
import Proveedor from '../models/proveedores.model.js';
import Compra from '../models/compras.model.js';
import { validateProveedor, sanitizeProveedor } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Proveedores
 * Maneja todas las operaciones CRUD para proveedores
 */
const proveedorController = {
    /**
     * Obtener todos los proveedores con filtros
     * @route GET /api/proveedores
     */
    getAllProveedores: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 7, 
                search = '', 
                documentType,
                isActive,
                todos = false
            } = req.query;

            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            
            if (!todos) {
                if (search) {
                    whereClause[Op.or] = [
                        { companyName: { [Op.like]: `%${search}%` } },
                        { documentNumber: { [Op.like]: `%${search}%` } },
                        { email: { [Op.like]: `%${search}%` } },
                        { phone: { [Op.like]: `%${search}%` } }
                    ];
                }
                
                if (documentType) {
                    whereClause.documentType = documentType;
                }
                
                if (isActive !== undefined) {
                    whereClause.isActive = isActive === 'true';
                }
            }

            // Consultar proveedores
            const { count, rows } = await Proveedor.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['companyName', 'ASC']]
            });

            // Retornar los datos tal cual están en el modelo para que el frontend mapee
            const proveedoresFormateados = rows.map(p => p.get({ plain: true }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: proveedoresFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                },
                filters: {
                    documentType: documentType || 'todos',
                    isActive: isActive || 'todos'
                },
                message: 'Proveedores obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllProveedores:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los proveedores',
                error: error.message
            });
        }
    },

    /**
     * Obtener un proveedor por ID
     * @route GET /api/proveedores/:id
     */
    getProveedorById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);

            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Obtener estadísticas de compras
            const totalCompras = await Compra.sum('total', {
                where: { idProveedor: id }
            }) || 0;

            const cantidadCompras = await Compra.count({
                where: { idProveedor: id }
            });

            res.status(200).json({
                success: true,
                data: {
                    ...proveedor.toJSON(),
                    supplierType: proveedor.getTipoProveedorTexto(),
                    estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    }
                },
                message: 'Proveedor obtenido exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getProveedorById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo proveedor
     * @route POST /api/proveedores
     */
    createProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const data = req.body;

            // Validar datos
            const validationErrors = await validateProveedor(data);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    errors: validationErrors,
                    message: 'Datos del proveedor inválidos'
                });
            }

            // Sanitizar datos
            const sanitizedData = sanitizeProveedor(data);

            // Crear proveedor
            const nuevoProveedor = await Proveedor.create({
                ...sanitizedData,
                isActive: true
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoProveedor,
                message: 'Proveedor registrado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createProveedor:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'El NIT o email ya está registrado',
                    error: error.errors[0].message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al registrar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un proveedor
     * @route PUT /api/proveedores/:id
     */
    updateProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const data = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Validar datos
            const validationErrors = await validateProveedor(data, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    errors: validationErrors,
                    message: 'Datos del proveedor inválidos'
                });
            }

            // Sanitizar datos
            const sanitizedData = sanitizeProveedor(data);

            await proveedor.update(sanitizedData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateProveedor:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'El NIT o email ya está registrado por otro proveedor'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Actualización parcial de proveedor (PATCH)
     * @route PATCH /api/proveedores/:id
     */
    patchProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            
            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Solo actualizar campos proporcionados
            await proveedor.update(req.body, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor actualizado parcialmente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patchProveedor:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un proveedor (borrado lógico)
     * @route DELETE /api/proveedores/:id
     */
    deleteProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // 🛡️ DESVINCULAR COMPRAS Y GUARDAR NOMBRE HISTÓRICO
            // Esto permite borrar el proveedor sin perder el historial de a quién se le compró
            const companyName = proveedor.companyName || proveedor.Nombre;
            
            await Compra.update(
                { 
                    idProveedor: null, 
                    proveedorNombreHistorico: companyName 
                }, 
                { 
                    where: { idProveedor: id },
                    transaction 
                }
            );

            // Eliminar permanentemente
            await proveedor.destroy({ transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Proveedor eliminado permanentemente (compras desvinculadas con historial)'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteProveedor:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Cambiar estado del proveedor
     * @route PATCH /api/proveedores/:id/estado
     */
    toggleProveedorStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            await proveedor.update({ isActive: !proveedor.isActive }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    id: proveedor.id,
                    isActive: proveedor.isActive,
                    estadoTexto: proveedor.isActive ? 'Activo' : 'Inactivo'
                },
                message: `Proveedor ${proveedor.isActive ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleProveedorStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cambiar el estado del proveedor',
                error: error.message
            });
        }
    },

    /**
     * Obtener proveedores activos (para selects)
     * @route GET /api/proveedores/activos
     */
    getProveedoresActivos: async (req, res) => {
        try {
            const proveedores = await Proveedor.findAll({
                where: { isActive: true },
                attributes: ['id', 'companyName', 'documentType', 'documentNumber'],
                order: [['companyName', 'ASC']]
            });

            const proveedoresFormateados = proveedores.map(p => ({
                id: p.id,
                companyName: p.companyName,
                identificacion: `${p.documentType}: ${p.documentNumber}`,
                tipoProveedor: p.getTipoProveedorTexto()
            }));

            res.status(200).json({
                success: true,
                data: proveedoresFormateados,
                message: 'Proveedores activos obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getProveedoresActivos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener proveedores activos',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de proveedores
     * @route GET /api/proveedores/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalProveedores = await Proveedor.count();
            const activos = await Proveedor.count({ where: { isActive: true } });
            const inactivos = await Proveedor.count({ where: { isActive: false } });
            
            const porTipoDocumento = await Proveedor.findAll({
                attributes: [
                    'documentType',
                    [sequelize.fn('COUNT', sequelize.col('TipoDocumento')), 'cantidad']
                ],
                group: ['TipoDocumento']
            });

            // Proveedores con más compras
            const proveedoresTop = await Proveedor.findAll({
                where: { isActive: true },
                attributes: ['id', 'companyName'],
                include: [{
                    model: Compra,
                    as: 'Compras',
                    attributes: []
                }],
                group: ['Proveedor.IdProveedor'],
                order: [[sequelize.fn('COUNT', sequelize.col('Compras.IdCompra')), 'DESC']],
                limit: 5
            });

            res.status(200).json({
                success: true,
                data: {
                    total: totalProveedores,
                    activos,
                    inactivos,
                    distribucionTipoDocumento: porTipoDocumento,
                    topProveedores: proveedoresTop
                },
                message: 'Estadísticas obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    },

    /**
     * Buscar proveedor por NIT
     * @route GET /api/proveedores/nit/:nit
     */
    getProveedorByNIT: async (req, res) => {
        try {
            const { nit } = req.params;

            const proveedor = await Proveedor.findOne({
                where: { 
                    documentNumber: nit,
                    documentType: 'NIT'
                }
            });

            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado con ese NIT'
                });
            }

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor encontrado'
            });

        } catch (error) {
            console.error('❌ Error en getProveedorByNIT:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar proveedor por NIT',
                error: error.message
            });
        }
    },

    /**
     * Obtener proveedores públicos (catálogo)
     * @route GET /api/proveedores/publicos
     */
    getProveedoresPublicos: async (req, res) => {
        try {
            const proveedores = await Proveedor.findAll({
                where: { isActive: true },
                attributes: ['id', 'companyName', 'documentType', 'documentNumber', 'email', 'phone'],
                limit: 50,
                order: [['companyName', 'ASC']]
            });

            res.status(200).json({
                success: true,
                data: proveedores,
                message: 'Proveedores públicos obtenidos exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en getProveedoresPublicos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener proveedores públicos',
                error: error.message
            });
        }
    },

    /**
     * Obtener proveedor público por ID
     * @route GET /api/proveedores/:id/publico
     */
    getProveedorPublicoById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findOne({
                where: { id: id, isActive: true },
                attributes: ['id', 'companyName', 'documentType', 'documentNumber', 'email', 'phone', 'address']
            });

            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor obtenido exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en getProveedorPublicoById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener proveedor',
                error: error.message
            });
        }
    },

    /**
     * Obtener compras por proveedor
     * @route GET /api/proveedores/:id/compras
     */
    getComprasByProveedor: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            const compras = await Compra.findAll({
                where: { idProveedor: id },
                order: [['fecha', 'DESC']],
                limit: 20
            });

            res.status(200).json({
                success: true,
                data: {
                    proveedor: {
                        IdProveedor: proveedor.IdProveedor,
                        Nombre: proveedor.Nombre
                    },
                    compras
                },
                message: 'Compras obtenidas exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en getComprasByProveedor:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener compras del proveedor',
                error: error.message
            });
        }
    },

    /**
     * Buscar proveedores (autocompletado)
     * @route GET /api/proveedores/buscar
     */
    buscarProveedores: async (req, res) => {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    message: 'Ingrese al menos 2 caracteres para buscar'
                });
            }

            const proveedores = await Proveedor.findAll({
                where: {
                    [Op.or]: [
                        { companyName: { [Op.iLike]: `%${q}%` } },
                        { documentNumber: { [Op.iLike]: `%${q}%` } },
                        { email: { [Op.iLike]: `%${q}%` } }
                    ],
                    isActive: true
                },
                attributes: ['id', 'companyName', 'documentType', 'documentNumber', 'email'],
                limit: 10,
                order: [['companyName', 'ASC']]
            });

            res.status(200).json({
                success: true,
                data: proveedores,
                message: 'Búsqueda completada'
            });
        } catch (error) {
            console.error('❌ Error en buscarProveedores:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar proveedores',
                error: error.message
            });
        }
    }
};

export default proveedorController;