/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

// services/compras.service.js
const { sequelize } = require('../config/database');
const Compra = require('../models/Compras');
const DetalleCompra = require('../models/DetalleCompras');
const Producto = require('../models/Producto');
const Proveedor = require('../models/Proveedor');

/**
 * Servicio de Compras
 * Lógica de negocio para compras
 */
const comprasService = {
    /**
     * Crear una compra con sus detalles
     */
    async createCompraWithDetails(compraData, detalles) {
        const transaction = await sequelize.transaction();
        
        try {
            // Crear compra
            const compra = await Compra.create({
                ...compraData,
                Fecha: new Date(),
                Estado: true
            }, { transaction });

            let total = 0;

            // Crear detalles y actualizar stock
            for (const item of detalles) {
                const subtotal = item.Cantidad * item.Precio;
                total += subtotal;

                await DetalleCompra.create({
                    IdCompra: compra.IdCompra,
                    IdProducto: item.IdProducto,
                    Cantidad: item.Cantidad,
                    Precio: item.Precio,
                    Subtotal: subtotal
                }, { transaction });

                // Actualizar stock
                await Producto.increment('Stock', {
                    by: item.Cantidad,
                    where: { IdProducto: item.IdProducto },
                    transaction
                });
            }

            // Actualizar total de la compra
            await compra.update({ Total: total }, { transaction });

            await transaction.commit();
            
            return await Compra.findByPk(compra.IdCompra, {
                include: ['Proveedor', 'Detalles']
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Anular compra
     */
    async anularCompra(compraId, motivo) {
        const transaction = await sequelize.transaction();
        
        try {
            const compra = await Compra.findByPk(compraId, {
                include: ['Detalles']
            });

            if (!compra) {
                throw new Error('Compra no encontrada');
            }

            if (!compra.Estado) {
                throw new Error('La compra ya está anulada');
            }

            // Revertir stock
            for (const detalle of compra.Detalles) {
                await Producto.decrement('Stock', {
                    by: detalle.Cantidad,
                    where: { IdProducto: detalle.IdProducto },
                    transaction
                });
            }

            // Anular compra
            await compra.update({
                Estado: false,
                MotivoAnulacion: motivo,
                FechaAnulacion: new Date()
            }, { transaction });

            await transaction.commit();
            
            return compra;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Obtener compras con filtros
     */
    async getCompras(filtros) {
        const whereClause = {};
        
        if (filtros.proveedor) {
            whereClause.IdProveedor = filtros.proveedor;
        }
        
        if (filtros.fechaInicio || filtros.fechaFin) {
            whereClause.Fecha = {};
            if (filtros.fechaInicio) whereClause.Fecha[Op.gte] = filtros.fechaInicio;
            if (filtros.fechaFin) whereClause.Fecha[Op.lte] = filtros.fechaFin;
        }
        
        if (filtros.estado !== undefined) {
            whereClause.Estado = filtros.estado;
        }

        return await Compra.findAndCountAll({
            where: whereClause,
            include: ['Proveedor'],
            limit: filtros.limit,
            offset: (filtros.page - 1) * filtros.limit,
            order: [['Fecha', 'DESC']]
        });
    }
};

module.exports = comprasService;