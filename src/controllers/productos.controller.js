/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/productos.controller.js
import { Op } from 'sequelize';
import Producto from '../models/productos.model.js';
import Categoria from '../models/categorias.model.js';
import { sequelize } from '../config/db.js';
import { validateProducto, sanitizeProducto } from '../utils/validationUtils.js';

const productoController = {
    /**
     * Obtener todos los productos con filtros y paginación
     * @route GET /api/productos
     */
    getAllProductos: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 999, // 🚀 Aumentamos el límite por defecto para que salgan todos los productos en la tienda
                search = '', 
                categoriaId,
                oferta,
                inventario,
                todos = false
            } = req.query;

            const offset = (page - 1) * limit;
            const whereClause = {};
            
            const isTodos = todos === 'true' || todos === true;

            if (!isTodos) {
                if (search) {
                    whereClause[Op.or] = [
                        { nombre: { [Op.iLike]: `%${search}%` } },
                        { descripcion: { [Op.iLike]: `%${search}%` } }
                    ];
                }
                
                if (categoriaId) {
                    whereClause.idCategoria = categoriaId;
                }
                
                if (oferta !== undefined) {
                    whereClause.enOfertaVenta = oferta === 'true';
                }
                
                if (inventario !== undefined) {
                    whereClause.enInventario = inventario === 'true';
                }
            }

            const queryOptions = {
                where: whereClause,
                include: [
                    {
                        model: Categoria,
                        as: 'categoriaData',
                        attributes: ['id', 'nombre', 'estado'],
                        // 🚀 FILTRAR POR CATEGORÍA ACTIVA SOLO EN LA TIENDA (cuando isTodos es falso)
                        where: !isTodos ? { estado: true } : undefined,
                        required: !isTodos // En la tienda es obligatorio que la categoría esté activa
                    }
                ],
                order: [['id', 'DESC']]
            };

            if (!isTodos) {
                queryOptions.limit = parseInt(limit);
                queryOptions.offset = parseInt(offset);
                // Asegurar que solo vemos productos activos y con stock en la tienda
                whereClause.isActive = { [Op.ne]: false }; 
                whereClause.stock = { [Op.gt]: 0 }; // 🚀 Solo productos con inventario real
            }

            const { count, rows } = await Producto.findAndCountAll(queryOptions);

            // 🚀 MAPEO PARA COMPATIBILIDAD CON FRONTEND LEGACY
            const productsWithLegacyMapped = rows.map(p => {
                const productPlain = p.get({ plain: true });
                
                // 🔥 SIEMPRE calcular el stock real desde tallasStock para evitar desincronización
                let currentStock = 0;
                if (Array.isArray(productPlain.tallasStock)) {
                    currentStock = productPlain.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
                } else if (productPlain.stock) {
                    currentStock = Number(productPlain.stock);
                }

                return {
                    ...productPlain,
                    id_producto: productPlain.id,
                    stock: currentStock,
                    precio_normal: productPlain.precioVenta,
                    precio_descuento: productPlain.precioOferta,
                    precio_mayorista6: productPlain.precioMayorista6, 
                    precio_mayorista80: productPlain.precioMayorista80, 
                    has_discount: productPlain.enOfertaVenta,
                    enOfertaVenta: productPlain.enOfertaVenta,
                    is_featured: productPlain.destacado || false,
                    is_oferta: productPlain.enOfertaVenta, 
                    is_active: productPlain.isActive !== undefined ? productPlain.isActive : true,
                    categoria_nombre: productPlain.categoria || productPlain.categoriaData?.nombre || 'General',
                    tallas: Array.isArray(productPlain.tallasStock) ? productPlain.tallasStock.map(t => t.talla) : [],
                    tallasStock: productPlain.tallasStock || [], // IMPORTANTE: Enviarlo explícitamente
                    sales_count: productPlain.sales || 0
                };
            });

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                status: 'success', // Requerido por Home.jsx
                data: {
                    products: productsWithLegacyMapped, // Requerido por Home.jsx y useProductos.js
                    rows: productsWithLegacyMapped,
                    count
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('❌ Error en getAllProductos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos por nombre de categoría (para la tienda)
     * @route GET /api/productos/por-categoria/:nombre
     */
    getProductosByCategoriaNombre: async (req, res) => {
        try {
            const { nombre } = req.params;

            // 1. Encontrar la categoría exacta para evitar bugs del ORM de Sequelize con JOINs y aliases
            const matchingCat = await Categoria.findOne({
                where: { nombre: { [Op.iLike]: nombre } },
                attributes: ['id']
            });

            // 2. Armar las condiciones de la búsqueda: nombre legacy OR ID relacional
            const orConditions = [ { categoria: { [Op.iLike]: nombre } } ];
            if (matchingCat) {
                orConditions.push({ idCategoria: matchingCat.id });
            }

            // 3. Ejecutar la búsqueda final
            const rows = await Producto.findAll({
                where: {
                    isActive: { [Op.ne]: false },
                    [Op.or]: orConditions
                },
                include: [{
                    model: Categoria,
                    as: 'categoriaData',
                    attributes: ['id', 'nombre', 'estado'],
                    required: false
                }],
                order: [['id', 'DESC']],
                limit: 100
            });

            const products = rows.map(p => {
                const plain = p.get({ plain: true });
                let stock = plain.stock || 0;
                if (stock === 0 && Array.isArray(plain.tallasStock)) {
                    stock = plain.tallasStock.reduce((s, t) => s + (Number(t.cantidad) || 0), 0);
                }
                return {
                    ...plain,
                    id_producto: plain.id,
                    stock,
                    precio_normal: plain.precioVenta,
                    precio_descuento: plain.precioOferta,
                    precio_mayorista6: plain.precioMayorista6,
                    precio_mayorista80: plain.precioMayorista80,
                    has_discount: plain.enOfertaVenta,
                    enOfertaVenta: plain.enOfertaVenta,
                    is_featured: plain.destacado || false,
                    is_oferta: plain.enOfertaVenta,
                    is_active: plain.isActive !== undefined ? plain.isActive : true,
                    categoria_nombre: plain.categoriaData?.nombre || plain.categoria || 'General',
                    tallas: Array.isArray(plain.tallasStock) ? plain.tallasStock.map(t => t.talla) : [],
                    tallasStock: plain.tallasStock || [],
                    sales_count: plain.sales || 0
                };
            });

            res.status(200).json({
                success: true,
                data: { products, count: products.length }
            });
        } catch (error) {
            console.error('❌ Error en getProductosByCategoriaNombre:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener un producto por ID
     * @route GET /api/productos/:id
     */
    getProductoById: async (req, res) => {
        try {
            const { id } = req.params;
            const producto = await Producto.findByPk(id);

            if (!producto) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            res.status(200).json({
                success: true,
                data: producto
            });
        } catch (error) {
            console.error('❌ Error en getProductoById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear un nuevo producto
     * @route POST /api/productos
     */
    createProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            console.log('📥 req.body recibido:', JSON.stringify(req.body, null, 2));

            const validationErrors = await validateProducto(req.body);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeProducto(req.body);
            
            // 🚀 SINCRONIZACIÓN DE DATOS REPRODUCIDA
            if (req.body.idCategoria) {
                sanitizedData.idCategoria = req.body.idCategoria;
                
                // Buscar el nombre de la categoría para sincronizar la columna de texto "Categoria"
                const catInfo = await Categoria.findByPk(req.body.idCategoria);
                if (catInfo) {
                    sanitizedData.categoria = catInfo.nombre || catInfo.Nombre;
                }
            }

            // Forzar booleanos correctamente para Sequelize (Mayúsculas)
            if (req.body.enInventario !== undefined) sanitizedData.enInventario = req.body.enInventario;
            if (req.body.isActive !== undefined) sanitizedData.isActive = req.body.isActive;

            // 🚀 CALCULAR STOCK TOTAL DESDE TALLASSTOCK
            if (Array.isArray(req.body.tallasStock)) {
                const totalStock = req.body.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
                sanitizedData.stock = totalStock;
            }

            console.log('🧹 sanitizedData FINAL a insertar:', JSON.stringify(sanitizedData, null, 2));

            const nuevoProducto = await Producto.create(sanitizedData, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoProducto,
                message: 'Producto registrado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createProducto:', error.message);
            console.error('❌ Tipo de error:', error.constructor.name);
            if (error.original) {
                console.error('❌ Error original PostgreSQL:', {
                    message: error.original.message,
                    detail: error.original.detail,
                    constraint: error.original.constraint,
                    column: error.original.column,
                    table: error.original.table,
                    code: error.original.code,
                });
            }
            if (error.errors) {
                console.error('❌ Errores de validación Sequelize:', error.errors.map(e => ({ field: e.path, msg: e.message })));
            }
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar un producto
     * @route PUT /api/productos/:id
     */
    updateProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const producto = await Producto.findByPk(id);

            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const validationErrors = await validateProducto(req.body, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeProducto(req.body);

            // 🚀 SINCRONIZACIÓN DE CATEGORÍA E INVENTARIO AL EDITAR
            if (req.body.idCategoria) {
                sanitizedData.idCategoria = req.body.idCategoria;
                const catInfo = await Categoria.findByPk(req.body.idCategoria);
                if (catInfo) {
                    sanitizedData.categoria = catInfo.nombre || catInfo.Nombre;
                }
            }

            // Forzar booleanos correctamente
            if (req.body.enInventario !== undefined) sanitizedData.enInventario = req.body.enInventario;
            if (req.body.isActive !== undefined) sanitizedData.isActive = req.body.isActive;

            // 🚀 RECALCULAR STOCK TOTAL AL EDITAR
            if (Array.isArray(req.body.tallasStock)) {
                const totalStock = req.body.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
                sanitizedData.stock = totalStock;
            }

            await producto.update(sanitizedData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: producto,
                message: 'Producto actualizado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar estado de oferta de un producto
     * @route PATCH /api/productos/:id/oferta
     */
    toggleOferta: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { enOfertaVenta, precioOferta, porcentajeDescuento } = req.body;

            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const updateData = { enOfertaVenta };
            if (enOfertaVenta) {
                updateData.precioOferta = precioOferta;
                updateData.porcentajeDescuento = porcentajeDescuento;
            } else {
                updateData.precioOferta = 0;
                updateData.porcentajeDescuento = null;
            }

            await producto.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: producto,
                message: enOfertaVenta ? 'Oferta activada' : 'Oferta desactivada'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleOferta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteProducto: async (req, res) => {
        const { id } = req.params;
        const transaction = await sequelize.transaction();
        
        try {
            const producto = await Producto.findByPk(id, { transaction });

            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            // 🚀 BORRADO TOTALMENTE LIBRE
            // Ya no bloqueamos por stock. Si el usuario borra, nosotros limpiamos.
            const tallasVacias = (producto.tallasStock || []).map(t => ({ ...t, cantidad: 0 }));
            
            await producto.update({ 
                stock: 0, 
                tallasStock: tallasVacias,
                isActive: false,
                enInventario: false 
            }, { transaction });

            // Borrado lógico (Soft Delete)
            await producto.destroy({ transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Producto eliminado exitosamente (se mantiene en el historial histórico de transacciones)'
            });
        } catch (error) {
            if (transaction) await transaction.rollback();
            
            console.error('❌ Error detallado en deleteProducto:', error);
            
            // Manejar errores específicos de base de datos
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Error de integridad: Este producto está siendo referenciado por otros registros.' 
                });
            }

            res.status(500).json({ 
                success: false, 
                message: 'Error interno de base de datos al intentar eliminar el producto' 
            });
        }
    }
};

export default productoController;