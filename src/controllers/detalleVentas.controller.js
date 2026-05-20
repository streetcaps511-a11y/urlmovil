/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/detalleVentas.controller.js
import DetalleVenta from '../models/detalleVentas.model.js';
import Producto from '../models/productos.model.js';
import Venta from '../models/ventas.model.js';
import Talla from '../models/tallas.model.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Detalle de Ventas
 * SOLO PARA CONSULTAS - Los detalles se crean/actualizan/eliminan desde ventas
 */
const detalleVentaController = {
    /**
     * Obtener todos los detalles (con filtros)
     * @route GET /api/detalleventas
     */
    getAll: async (req, res) => {
        try {
            const { IdVenta, IdProducto, page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (IdVenta) whereClause.IdVenta = IdVenta;
            if (IdProducto) whereClause.IdProducto = IdProducto;

            const { count, rows } = await DetalleVenta.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Producto,
                        as: 'Producto',
                        attributes: ['IdProducto', 'Nombre', 'url', 'Descripcion', 'PrecioVenta'],
                        paranoid: false
                    },
                    {
                        model: Talla,
                        as: 'Talla',
                        attributes: ['IdTalla', 'Nombre']
                    },
                    {
                        model: Venta,
                        as: 'Venta',
                        attributes: ['IdVenta', 'Fecha', 'Total']
                    }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdDetalleVenta', 'DESC']]
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('❌ Error en getAll:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener detalles por venta
     * @route GET /api/detalleventas/venta/:ventaId
     */
    getByVenta: async (req, res) => {
        try {
            const { ventaId } = req.params;

            if (isNaN(ventaId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de venta inválido' 
                });
            }

            const detalles = await DetalleVenta.findAll({
                where: { IdVenta: ventaId },
                include: [
                    {
                        model: Producto,
                        as: 'Producto',
                        attributes: ['IdProducto', 'Nombre', 'url', 'Descripcion', 'PrecioVenta'],
                        paranoid: false
                    },
                    {
                        model: Talla,
                        as: 'Talla',
                        attributes: ['IdTalla', 'Nombre']
                    }
                ],
                order: [['IdDetalleVenta', 'ASC']]
            });

            if (!detalles || detalles.length === 0) {
                return res.json({ 
                    success: true, 
                    data: [], 
                    message: 'No hay detalles para esta venta' 
                });
            }

            const detallesFormateados = detalles.map(detalle => ({
                IdDetalleVenta: detalle.IdDetalleVenta,
                IdVenta: detalle.IdVenta,
                IdProducto: detalle.IdProducto,
                IdTalla: detalle.IdTalla,
                Producto: {
                    Nombre: detalle.Producto?.Nombre || 'Producto no disponible',
                    Descripcion: detalle.Producto?.Descripcion,
                    Imagen: detalle.Producto?.url
                },
                Talla: {
                    IdTalla: detalle.Talla?.IdTalla,
                    Nombre: detalle.Talla?.Nombre || 'Sin talla'
                },
                Cantidad: detalle.Cantidad,
                PrecioUnitario: detalle.Precio,
                Subtotal: detalle.Subtotal,
                SubtotalFormateado: new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                }).format(detalle.Subtotal)
            }));

            res.json({ 
                success: true, 
                data: detallesFormateados 
            });

        } catch (error) {
            console.error('❌ Error en getByVenta:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * Obtener un detalle específico por ID
     * @route GET /api/detalleventas/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de detalle inválido' 
                });
            }

            const detalle = await DetalleVenta.findByPk(id, {
                include: [
                    {
                        model: Producto,
                        as: 'Producto',
                        attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta'],
                        paranoid: false
                    },
                    {
                        model: Talla,
                        as: 'Talla',
                        attributes: ['IdTalla', 'Nombre']
                    },
                    {
                        model: Venta,
                        as: 'Venta',
                        include: [{ model: Talla, as: 'Tallas' }]
                    }
                ]
            });

            if (!detalle) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Detalle no encontrado' 
                });
            }

            res.json({ 
                success: true, 
                data: detalle 
            });

        } catch (error) {
            console.error('❌ Error en getById:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * Obtener resumen de una venta (total productos, subtotal, etc)
     * @route GET /api/detalleventas/venta/:ventaId/resumen
     */
    getResumenByVenta: async (req, res) => {
        try {
            const { ventaId } = req.params;

            const detalles = await DetalleVenta.findAll({
                where: { IdVenta: ventaId }
            });

            const totalProductos = detalles.reduce((sum, d) => sum + d.Cantidad, 0);
            const subtotal = detalles.reduce((sum, d) => sum + d.Subtotal, 0);

            res.json({
                success: true,
                data: {
                    totalProductos,
                    subtotal,
                    cantidadItems: detalles.length
                }
            });
        } catch (error) {
            console.error('❌ Error en getResumenByVenta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Marcar detalle como devuelto (para devoluciones parciales)
     * @route PATCH /api/detalleventas/:id/devolver
     */
    marcarDevuelto: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { cantidadDevuelta } = req.body;

            const detalle = await DetalleVenta.findByPk(id);
            if (!detalle) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
            }

            if (cantidadDevuelta > detalle.Cantidad) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'La cantidad devuelta no puede ser mayor a la cantidad vendida' 
                });
            }

            // Actualizar cantidad devuelta
            await detalle.update({
                CantidadDevuelta: cantidadDevuelta,
                Devuelto: cantidadDevuelta === detalle.Cantidad
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                data: detalle,
                message: 'Devolución registrada en el detalle'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en marcarDevuelto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear detalle de venta (solo para administración)
     * @route POST /api/detalleventas
     */
    create: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { IdVenta, IdProducto, IdTalla, Cantidad, Precio } = req.body;

            if (!IdVenta || !IdProducto || !Cantidad || !Precio) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
            }

            const subtotal = Cantidad * Precio;
            const nuevoDetalle = await DetalleVenta.create({
                IdVenta,
                IdProducto,
                IdTalla,
                Cantidad,
                Precio,
                Subtotal: subtotal,
                Devuelto: false,
                CantidadDevuelta: 0
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoDetalle,
                message: 'Detalle creado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en create:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar detalle de venta
     * @route PUT /api/detalleventas/:id
     */
    update: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { Cantidad, Precio, IdTalla } = req.body;

            const detalle = await DetalleVenta.findByPk(id);
            if (!detalle) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
            }

            const subtotal = Cantidad * Precio;
            await detalle.update({
                Cantidad,
                Precio,
                IdTalla,
                Subtotal: subtotal
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                data: detalle,
                message: 'Detalle actualizado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en update:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar detalle de venta (solo admin)
     * @route DELETE /api/detalleventas/:id
     */
    delete: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            const detalle = await DetalleVenta.findByPk(id);
            if (!detalle) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
            }

            await detalle.destroy({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Detalle eliminado exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en delete:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default detalleVentaController;