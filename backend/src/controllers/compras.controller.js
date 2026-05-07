/* === CONTROLADOR DE BACKEND (COMPRAS) === 
   Gestiona el registro de entrada de mercancía, actualización de inventario y 
   seguimiento de proveedores. */

import { Op } from 'sequelize';
import { 
    Compra, 
    DetalleCompra, 
    Proveedor, 
    Producto, 
    sequelize 
} from '../models/index.js';

const compraController = {
    getEstadisticas: async (req, res) => {
        try {
            const total = await Compra.count();
            const totalInversion = await Compra.sum('total') || 0;
            const comprasMes = await Compra.count({ 
                where: { 
                    fecha: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } 
                } 
            });
            res.json({ success: true, data: { total, totalInversion, comprasMes } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getComprasByProveedor: async (req, res) => {
        try {
            const data = await Compra.findAll({ 
                where: { idProveedor: req.params.proveedorId },
                include: [{ model: DetalleCompra, as: 'detalles' }]
            });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getAllCompras: async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            const count = await Compra.count();
            const comprasRows = await Compra.findAll({
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['fecha', 'DESC']],
                include: [
                    { model: Proveedor, as: 'proveedorData', attributes: ['id', 'nombre', 'email'] },
                    { 
                        model: DetalleCompra, 
                        as: 'detalles', 
                        include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'], paranoid: false }] 
                    }
                ]
            });

            res.json({ 
                success: true, 
                data: comprasRows, 
                pagination: { 
                    totalItems: count, 
                    currentPage: parseInt(page), 
                    totalPages: Math.ceil(count / limit) 
                } 
            });
        } catch (error) {
            console.error('❌ Error en getAllCompras:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getCompraById: async (req, res) => {
        try {
            const compra = await Compra.findByPk(req.params.id, { 
                include: [
                    { model: Proveedor, as: 'proveedorData' },
                    { 
                        model: DetalleCompra, 
                        as: 'detalles', 
                        include: [{ model: Producto, as: 'producto', paranoid: false }] 
                    }
                ] 
            });
            if (!compra) return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            res.json({ success: true, data: compra });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    generarReporte: async (req, res) => {
        res.json({ success: true, message: 'Reporte generado exitosamente' });
    },

    createCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { idProveedor, productos, metodoPago, numeroRecibo, fecha } = req.body;

            let totalCompra = 0;
            const detallesFinales = [];

            for (const item of productos) {
                const productId = item.idProducto || item.id;
                
                // Procesar variantes (tallas y cantidades)
                const variantes = item.variantes || [];
                const totalCantidadItem = variantes.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
                const subtotalItem = totalCantidadItem * (parseFloat(item.precioCompra) || 0);
                totalCompra += subtotalItem;

                detallesFinales.push({
                    idProducto: productId,
                    nombreProducto: item.nombre || item.nombreProducto,
                    variantes: variantes,
                    cantidad: totalCantidadItem,
                    precioCompra: item.precioCompra,
                    precioVenta: item.precioVenta,
                    precioMayorista6: item.precioMayorista6,
                    precioMayorista80: item.precioMayorista80,
                    subtotal: subtotalItem,
                    nFactura: numeroRecibo
                });

                // Actualizar stock del producto (Incrementar)
                const producto = await Producto.findByPk(productId, { transaction });
                if (producto) {
                    const tallasStock = JSON.parse(JSON.stringify(producto.tallasStock || []));
                    
                    for (const v of variantes) {
                        const idx = tallasStock.findIndex(s => String(s.talla).toUpperCase().trim() === String(v.talla).toUpperCase().trim());
                        if (idx !== -1) {
                            tallasStock[idx].cantidad = (parseInt(tallasStock[idx].cantidad) || 0) + (parseInt(v.cantidad) || 0);
                        } else {
                            tallasStock.push({ talla: v.talla, cantidad: parseInt(v.cantidad) || 0 });
                        }
                    }

                    const nuevoStockGlobal = tallasStock.reduce((sum, s) => sum + (parseInt(s.cantidad) || 0), 0);
                    
                    await producto.update({
                        tallasStock,
                        stock: nuevoStockGlobal,
                        // Actualizar precios base del producto según la última compra
                        precioVenta: item.precioVenta || producto.precioVenta,
                        precioMayorista6: item.precioMayorista6 || producto.precioMayorista6,
                        precioMayorista80: item.precioMayorista80 || producto.precioMayorista80
                    }, { transaction });
                }
            }

            const nuevaCompra = await Compra.create({
                idProveedor,
                numeroRecibo,
                fecha: fecha || new Date(),
                fechaRegistro: new Date(),
                total: totalCompra,
                metodoPago: metodoPago || 'Efectivo',
                estado: 'Completada'
            }, { transaction });

            for (const d of detallesFinales) {
                await DetalleCompra.create({
                    ...d,
                    idCompra: nuevaCompra.id
                }, { transaction });
            }

            await transaction.commit();
            
            const resultado = await Compra.findByPk(nuevaCompra.id, {
                include: [
                    { model: Proveedor, as: 'proveedorData' },
                    { model: DetalleCompra, as: 'detalles', include: ['producto'] }
                ]
            });

            res.status(201).json({ success: true, data: resultado });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Error en createCompra:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { estado } = req.body;
            await Compra.update({ estado }, { where: { id: req.params.id } });
            res.json({ success: true, message: 'Estado actualizado correctamente' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    anularCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const compra = await Compra.findByPk(req.params.id, {
                include: [{ model: DetalleCompra, as: 'detalles' }]
            });

            if (!compra || compra.estado === 'Anulada') {
                throw new Error('Compra no encontrada o ya anulada');
            }

            // Revertir stock (Restar lo que se había sumado)
            for (const d of compra.detalles) {
                const producto = await Producto.findByPk(d.idProducto, { transaction });
                if (producto) {
                    const tallasStock = JSON.parse(JSON.stringify(producto.tallasStock || []));
                    const variantes = d.variantes || [];

                    for (const v of variantes) {
                        const idx = tallasStock.findIndex(s => String(s.talla).toUpperCase().trim() === String(v.talla).toUpperCase().trim());
                        if (idx !== -1) {
                            tallasStock[idx].cantidad = Math.max(0, (parseInt(tallasStock[idx].cantidad) || 0) - (parseInt(v.cantidad) || 0));
                        }
                    }

                    const nuevoStockGlobal = tallasStock.reduce((sum, s) => sum + (parseInt(s.cantidad) || 0), 0);
                    await producto.update({ tallasStock, stock: nuevoStockGlobal }, { transaction });
                }
            }

            await compra.update({ estado: 'Anulada' }, { transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Compra anulada correctamente' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

export default compraController;
