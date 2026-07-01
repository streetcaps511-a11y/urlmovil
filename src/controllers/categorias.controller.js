/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/categorias.controller.js
import { Op } from 'sequelize';
import Categoria from '../models/categorias.model.js';
import Producto from '../models/productos.model.js';
import { validateCategoria, sanitizeCategoria } from '../utils/validationUtils.js';
import { successResponse, errorResponse, paginationResponse } from '../utils/response.js';
import cloudinary from '../config/cloudinary.config.js';

const uploadBase64ToCloudinary = async (base64String, prefix = 'categoria') => {
    if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:image/')) {
        return base64String;
    }
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: 'categorias',
            resource_type: 'auto',
            public_id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            overwrite: false,
            type: 'upload'
        });
        return result.secure_url;
    } catch (error) {
        console.error('❌ Error subiendo imagen de categoría a Cloudinary:', error);
        throw new Error('Error al subir la imagen de la categoría a la nube: ' + error.message);
    }
};

const categoriaController = {
    /**
     * Obtener todas las categorías
     * @route GET /api/categorias
     */
    getAllCategorias: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', estado, todos = false } = req.query;
            const isTodos = todos === 'true' || todos === true;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { nombre: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (estado !== undefined) {
                whereClause.estado = estado === 'true';
            } else if (!isTodos) {
                // En la tienda (isTodos=false) solo mostramos categorías activas
                whereClause.estado = true;
            }

            const queryOptions = {
                where: whereClause,
                order: [['id', 'DESC']]
            };

            if (!isTodos) {
                queryOptions.limit = parseInt(limit);
                queryOptions.offset = parseInt(offset);
            }

            const { count, rows } = await Categoria.findAndCountAll(queryOptions);

            const categoriasConProductos = await Promise.all(rows.map(async (categoria) => {
                const totalProductos = await Producto.count({
                    where: { idCategoria: categoria.id }
                });
                
                return {
                    ...categoria.toJSON(),
                    totalProductos
                };
            }));

            return paginationResponse(
                res, 
                categoriasConProductos, 
                count, 
                parseInt(page), 
                parseInt(limit),
                'Categorías obtenidas exitosamente'
            );

        } catch (error) {
            console.error('❌ Error en getAllCategorias:', error);
            return errorResponse(res, 'Error al obtener las categorías', 500, error.message);
        }
    },

    /**
     * Obtener categoría por ID
     * @route GET /api/categorias/:id
     */
    getCategoriaById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);

            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            const productos = await Producto.findAll({
                where: { idCategoria: id, isActive: true },
                limit: 5,
                order: [['nombre', 'ASC']]
            });

            return successResponse(res, {
                categoria,
                productos,
                totalProductos: await Producto.count({ where: { idCategoria: id } })
            }, 'Categoría obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getCategoriaById:', error);
            return errorResponse(res, 'Error al obtener la categoría', 500, error.message);
        }
    },

    /**
     * Crear categoría
     * @route POST /api/categorias
     */
    createCategoria: async (req, res) => {
        try {
            const { nombre, descripcion, imagenUrl, estado = true } = req.body;

            let finalImagenUrl = imagenUrl;
            if (imagenUrl && typeof imagenUrl === 'string' && imagenUrl.startsWith('data:image/')) {
                finalImagenUrl = await uploadBase64ToCloudinary(imagenUrl, 'categoria');
            }

            const validationErrors = await validateCategoria({ nombre, descripcion, imagenUrl: finalImagenUrl, estado });
            if (validationErrors.length > 0) {
                return errorResponse(res, 'Datos de categoría inválidos', 400, validationErrors);
            }

            const sanitizedData = sanitizeCategoria({ nombre, descripcion, imagenUrl: finalImagenUrl, estado });
            const nuevaCategoria = await Categoria.create(sanitizedData);

            return successResponse(res, nuevaCategoria, 'Categoría creada exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en createCategoria:', error);
            
            // Manejo de errores de validación de Sequelize
            if (error.name === 'SequelizeValidationError') {
                const messages = error.errors.map(err => err.message);
                return errorResponse(res, 'Error de validación', 400, messages);
            }

            // Manejo de unicidad (nombre o imagenUrl)
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors[0]?.path;
                const message = field === 'imagenUrl' || field === 'ImagenUrl'
                    ? 'Esta URL de imagen ya está siendo usada por otra categoría'
                    : 'Ya existe una categoría con ese nombre';
                return errorResponse(res, message, 400);
            }

            return errorResponse(res, 'Error al crear la categoría', 500, error.message);
        }
    },

    /**
     * Actualizar categoría
     * @route PUT /api/categorias/:id
     */
    updateCategoria: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, imagenUrl, estado } = req.body;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            let finalImagenUrl = imagenUrl;
            if (imagenUrl && typeof imagenUrl === 'string' && imagenUrl.startsWith('data:image/')) {
                finalImagenUrl = await uploadBase64ToCloudinary(imagenUrl, 'categoria');
            }

            const validationErrors = await validateCategoria({ nombre, descripcion, imagenUrl: finalImagenUrl, estado }, id);
            if (validationErrors.length > 0) {
                return errorResponse(res, 'Datos de categoría inválidos', 400, validationErrors);
            }

            const sanitizedData = sanitizeCategoria({ nombre, descripcion, imagenUrl: finalImagenUrl, estado });
            await categoria.update(sanitizedData);

            return successResponse(res, categoria, 'Categoría actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en updateCategoria:', error);
            
            // Manejo de errores de validación de Sequelize
            if (error.name === 'SequelizeValidationError') {
                const messages = error.errors.map(err => err.message);
                return errorResponse(res, 'Error de validación', 400, messages);
            }

            // Manejo de unicidad
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors[0]?.path;
                const message = field === 'imagenUrl' || field === 'ImagenUrl'
                    ? 'Esta URL de imagen ya está siendo usada por otra categoría'
                    : 'Ya existe otra categoría con ese nombre';
                return errorResponse(res, message, 400);
            }
            
            return errorResponse(res, 'Error al actualizar la categoría', 500, error.message);
        }
    },

    deleteCategoria: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            // Solo contamos productos activos (no los borrados lógicamente con soft delete)
            const productosActivos = await Producto.count({
                where: { idCategoria: id }
                // paranoid: true por defecto → excluye los soft-deleted
            });

            if (productosActivos > 0) {
                return errorResponse(res, 
                    `No se puede eliminar la categoría porque tiene ${productosActivos} producto(s) activo(s). Elimínalos o reasígnalos a otra categoría primero.`, 
                    400
                );
            }

            // Buscar cualquier otra categoría para reasignar los productos eliminados lógicamente (soft-deleted)
            const otraCategoria = await Categoria.findOne({
                where: {
                    id: { [Op.ne]: id }
                }
            });

            if (otraCategoria) {
                await Producto.update(
                    { idCategoria: otraCategoria.id },
                    {
                        where: { idCategoria: id },
                        paranoid: false // Incluye los soft-deleted
                    }
                );
            } else {
                // Si no hay otra categoría, lanzamos un error descriptivo ya que no se pueden dejar los productos con idCategoria null
                return errorResponse(res, 'No se puede eliminar la última categoría del sistema ya que contiene productos registrados.', 400);
            }

            await categoria.destroy();
            return successResponse(res, null, 'Categoría eliminada exitosamente');

        } catch (error) {
            console.error('❌ Error en deleteCategoria:', error);
            return errorResponse(res, 'Error al eliminar la categoría', 500, error.message);
        }
    },

    /**
     * Cambiar estado de categoría
     * @route PATCH /api/categorias/:id/estado
     */
    toggleCategoriaStatus: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            await categoria.update({ estado: !categoria.estado });

            return successResponse(res, {
                id: categoria.id,
                nombre: categoria.nombre,
                estado: categoria.estado
            }, `Categoría ${categoria.estado ? 'activada' : 'desactivada'} exitosamente`);

        } catch (error) {
            console.error('❌ Error en toggleCategoriaStatus:', error);
            return errorResponse(res, 'Error al cambiar el estado', 500, error.message);
        }
    },

    /**
     * Obtener categorías activas
     * @route GET /api/categorias/activas
     */
    getCategoriasActivas: async (req, res) => {
        try {
            const categorias = await Categoria.findAll({
                where: { estado: true },
                attributes: ['id', 'nombre'],
                order: [['nombre', 'ASC']]
            });

            return successResponse(res, categorias, 'Categorías activas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getCategoriasActivas:', error);
            return errorResponse(res, 'Error al obtener categorías activas', 500, error.message);
        }
    },

    /**
     * Obtener estadísticas de categorías
     * @route GET /api/categorias/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalCategorias = await Categoria.count();
            const activas = await Categoria.count({ where: { estado: true } });
            const inactivas = await Categoria.count({ where: { estado: false } });
            
            return successResponse(res, {
                total: totalCategorias,
                activas,
                inactivas
            }, 'Estadísticas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500, error.message);
        }
    }
};

export default categoriaController;