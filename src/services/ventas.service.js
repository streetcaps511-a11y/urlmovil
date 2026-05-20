/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

// services/ventas.service.js
const { sequelize, Op } = require('../config/database');
const Venta = require('../models/Ventas');
const DetalleVenta = require('../models/DetalleVentas');
const Producto = require('../models/Producto');
const Cliente = require('../models/Clientes');

/**
 * Servicio de Ventas
 * Lógica de negocio para ventas
 */
const ventasService = {
    /**
     * Crear una venta con sus detalles
     */
    async createVentaWithDetails(ventaData, detalles) {
        const transaction = await sequelize.transaction();
        
        try {
            // Crear venta
            const venta = await Venta.create({
                ...ventaData,
                Fecha: new Date(),
                IdEstado: 'Pendiente'
            }, { transaction });

            let total = 0;

            // Crear detalles y actualizar stock
            for (const item of detalles) {
                // Verificar stock
                const producto = await Producto.findByPk(item.IdProducto, { transaction });
                if (producto.Stock < item.Cantidad) {
                    throw new Error(`Stock insuficiente para ${producto.Nombre}`);
                }

                const subtotal = item.Cantidad * item.Precio;
                total += subtotal;

                await DetalleVenta.create({
                    IdVenta: venta.IdVenta,
                    IdProducto: item.IdProducto,
                    Cantidad: item.Cantidad,
                    Precio: item.Precio,
                    Subtotal: subtotal
                }, { transaction });

                // Descontar stock
                await Producto.decrement('Stock', {
                    by: item.Cantidad,
                    where: { IdProducto: item.IdProducto },
                    transaction
                });
            }

            // Actualizar total de la venta
            await venta.update({ Total: total }, { transaction });

            await transaction.commit();
            
            return await Venta.findByPk(venta.IdVenta, {
                include: ['Cliente', 'Estado', 'Detalles']
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Anular venta
     */
    async anularVenta(ventaId) {
        const transaction = await sequelize.transaction();
        
        try {
            const venta = await Venta.findByPk(ventaId, {
                include: ['Detalles']
            });

            if (!venta) {
                throw new Error('Venta no encontrada');
            }

            if (venta.IdEstado === 'Anulada') {
                throw new Error('La venta ya está anulada');
            }

            // Revertir stock
            for (const detalle of venta.Detalles) {
                await Producto.increment('Stock', {
                    by: detalle.Cantidad,
                    where: { IdProducto: detalle.IdProducto },
                    transaction
                });
            }

            // Anular venta
            await venta.update({ IdEstado: 'Anulada' }, { transaction });

            await transaction.commit();
            
            return venta;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Obtener ventas con filtros
     */
    async getVentas(filtros) {
        const whereClause = {};
        
        if (filtros.cliente) {
            whereClause.IdCliente = filtros.cliente;
        }
        
        if (filtros.fechaInicio || filtros.fechaFin) {
            whereClause.Fecha = {};
            if (filtros.fechaInicio) whereClause.Fecha[Op.gte] = filtros.fechaInicio;
            if (filtros.fechaFin) whereClause.Fecha[Op.lte] = filtros.fechaFin;
        }
        
        if (filtros.estado) {
            whereClause.IdEstado = filtros.estado;
        }

        return await Venta.findAndCountAll({
            where: whereClause,
            include: ['Cliente', 'Estado'],
            limit: filtros.limit,
            offset: (filtros.page - 1) * filtros.limit,
            order: [['Fecha', 'DESC']]
        });
    },

    /**
     * Obtener estadísticas de ventas
     */
    async getEstadisticas() {
        const totalVentas = await Venta.count();
        const totalIngresos = await Venta.sum('Total', { where: { IdEstado: 'Completada' } }) || 0;
        
        // Ventas por mes
        const ventasPorMes = await Venta.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('Fecha'), '%Y-%m'), 'mes'],
                [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'cantidad'],
                [sequelize.fn('SUM', sequelize.col('Total')), 'total']
            ],
            where: { IdEstado: 'Completada' },
            group: ['mes'],
            order: [[sequelize.literal('mes'), 'DESC']],
            limit: 6
        });

        return {
            totalVentas,
            totalIngresos,
            ventasPorMes
        };
    }
};

module.exports = ventasService;