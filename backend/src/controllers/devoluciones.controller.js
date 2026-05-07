/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/devoluciones.controller.js
import { Op } from 'sequelize';
import { 
    Devolucion, 
    Producto, 
    Venta, 
    DetalleVenta, 
    Cliente, 
    Estado,
    sequelize 
} from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper para disminuir stock del producto de cambio
 */
const decreaseProductStock = async (devolucion, transaction) => {
    let targetId = devolucion.idProductoCambio;
    
    // Si no hay ID, intentar por nombre
    if (!targetId && devolucion.productoCambio) {
        const found = await Producto.findOne({ 
            where: { nombre: { [Op.iLike]: devolucion.productoCambio } }, 
            transaction 
        });
        if (found) targetId = found.id;
    }

    if (!targetId) {
        console.warn(`⚠️ No se pudo encontrar el ID del producto de cambio para la devolución #${devolucion.id}`);
        return false;
    }

    const prodC = await Producto.findByPk(targetId, { transaction });
    if (!prodC) return false;

    const reduceQty = parseInt(devolucion.cantidad) || 1;
    const targetTalla = devolucion.talla ? devolucion.talla.toString().trim().toUpperCase() : 'U';
    
    let tallasData = Array.isArray(prodC.tallasStock) ? [...prodC.tallasStock] : [];
    let updated = false;

    tallasData = tallasData.map(t => {
        const tName = (t.talla || t.Nombre || t.nombre || '');
        const tCompare = String(tName).trim().toUpperCase();
        if (tCompare === targetTalla) {
            t.cantidad = Math.max(0, (parseInt(t.cantidad) || 0) - reduceQty);
            updated = true;
        }
        return t;
    });

    if (updated) {
        prodC.tallasStock = tallasData;
        prodC.changed('tallasStock', true);
        prodC.stock = tallasData.reduce((acc, t) => acc + (parseInt(t.cantidad) || 0), 0);
        await prodC.save({ transaction });
        console.log(`📉 Stock de ${prodC.nombre} disminuido (talla ${targetTalla})`);
        return true;
    }
    
    console.warn(`⚠️ Talla ${targetTalla} no encontrada para ${prodC.nombre}`);
    return false;
};

const devolucionController = {
    getEstadisticas: async (req, res) => {
        try {
            const total = await Devolucion.count();
            res.json({ success: true, data: { total, pendientes: 0 } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getAllDevoluciones: async (req, res) => {
        try {
            const { page = 1, limit = 1000 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Devolucion.findAndCountAll({
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['fecha', 'DESC']],
                include: [
                    {
                        model: Venta,
                        as: 'ventaOriginal',
                        include: [
                            {
                                model: Cliente,
                                as: 'clienteData',
                                attributes: ['id', 'nombreCompleto', 'numeroDocumento']
                            }
                        ]
                    },
                    {
                        model: Producto,
                        as: 'productoInfo',
                        attributes: ['id', 'nombre'],
                        required: false,
                        paranoid: false
                    }
                ]
            });
            res.json({ success: true, data: rows, pagination: { totalItems: count, currentPage: parseInt(page), totalPages: Math.ceil(count / limit) } });
        } catch (error) {
            console.error('❌ Error en getAllDevoluciones:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionById: async (req, res) => {
        try {
            const data = await Devolucion.findByPk(req.params.id, {
                include: [{ model: Producto, as: 'productoInfo', paranoid: false }]
            });
            if (!data) return res.status(404).json({ success: false, message: 'No encontrada' });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionesByVenta: async (req, res) => {
        try {
            const data = await Devolucion.findAll({ where: { idVenta: req.params.ventaId } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionesByProducto: async (req, res) => {
        try {
            const data = await Devolucion.findAll({ where: { idProducto: req.params.productoId } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createDevolucion: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            let { 
                idCliente, 
                idProductoOriginal, 
                idProductoCambio, 
                idVenta, 
                cantidad, 
                motivo, 
                observacion,
                precioUnitario,
                talla,
                evidencia,
                evidencia2,
                mismoModelo,
                pedidoCompleto,
                idLote
            } = req.body;
            
            const userRolId = Number(req.usuario?.idRol || req.usuario?.IdRol || 0);
            const rolName = String(req.rol?.nombre || req.rol?.Nombre || '').toLowerCase();
            const isAdmin = rolName.includes('admin') || userRolId === 1;
            
            // Si no viene idCliente, intentar obtenerlo del usuario autenticado
            if (!idCliente && req.usuario?.clienteData) {
                idCliente = req.usuario.clienteData.id;
            }

            // 🛠️ VALIDACIÓN DE IDs
            if (!idVenta || isNaN(Number(idVenta)) || !idProductoOriginal || isNaN(Number(idProductoOriginal))) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `IDs inválidos proporcionados. idVenta: ${idVenta}, idProducto: ${idProductoOriginal}` 
                });
            }

            // 🔍 PREVENIR DUPLICADOS
            const existing = await Devolucion.findOne({
                where: { 
                    idVenta: Number(idVenta), 
                    idProducto: Number(idProductoOriginal) 
                },
                transaction
            });
            if (existing) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Ya existe una solicitud de devolución para este producto en este pedido' });
            }

            let extra = {
                idEstado: isAdmin ? 'Completada' : 'Pendiente', 
                idProducto: parseInt(idProductoOriginal) || null,
                idProductoCambio: parseInt(idProductoCambio) || null,
                idVenta: parseInt(idVenta) || null,
                cantidad: parseInt(cantidad) || 1,
                valor: parseFloat(precioUnitario) || 0,
                talla: talla || null,
                motivo: motivo || null,
                observacion: observacion || null,
                mismoModelo: mismoModelo === true || mismoModelo === 'true' || false,
                pedidoCompleto: pedidoCompleto === true || pedidoCompleto === 'true' || false,
                noVenta: idVenta || null
            };

            // 🔍 BUSCAR INFO DEL CLIENTE
            if (idCliente) {
                const cli = await Cliente.findByPk(idCliente, { transaction });
                if (cli) {
                    extra.tipoDocumento = cli.tipoDocumento || 'CC';
                    extra.numeroDocumento = cli.numeroDocumento || cli.Documento || null;
                    extra.nombreCliente = cli.nombreCompleto || cli.Nombre || null;
                }
            }

            if (idProductoOriginal) {
                const prod = await Producto.findByPk(idProductoOriginal, { transaction });
                if (prod) {
                    extra.productoOriginal = (prod.Nombre || prod.nombre || '').substring(0, 255);
                    if (!precioUnitario) extra.valor = prod.Precio || prod.precio || 0;
                }
            }

            if (idProductoCambio) {
                const prodC = await Producto.findByPk(idProductoCambio, { transaction });
                if (prodC) {
                    extra.productoCambio = (prodC.Nombre || prodC.nombre || '').substring(0, 255);
                }
            }

            // 📸 MANEJO DE EVIDENCIA
            const saveEvidence = (base64, prefix) => {
                if (!base64 || typeof base64 !== 'string' || !base64.startsWith('data:image/')) return null;
                try {
                    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
                    const extension = base64.split(';')[0].split('/')[1];
                    const fileName = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;
                    const dir = path.join(process.cwd(), 'public', 'uploads', 'devoluciones');
                    
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    
                    const filePath = path.join(dir, fileName);
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    return `/uploads/devoluciones/${fileName}`;
                } catch (err) {
                    console.error(`❌ Error guardando ${prefix}:`, err);
                    return null;
                }
            };

            const evidenciaUrl = saveEvidence(evidencia, 'evidencia');
            const evidencia2Url = saveEvidence(evidencia2, 'evidencia2');

            const nueva = await Devolucion.create({ 
                ...extra, 
                evidencia: evidenciaUrl || evidencia || null,
                evidencia2: evidencia2Url || evidencia2 || null
            }, { transaction });

            // 🔥 Si es Admin, descontar stock de cambio inmediatamente
            if (isAdmin && (nueva.idProductoCambio || nueva.productoCambio)) {
                await decreaseProductStock(nueva, transaction);
            }

            await transaction.commit();
            res.status(201).json({ success: true, data: nueva });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Error en createDevolucion:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    updateDevolucion: async (req, res) => {
        const { id } = req.params;
        let transaction;
        try {
            transaction = await sequelize.transaction();
            const dev = await Devolucion.findByPk(id, { transaction });
            if (!dev) {
                if (transaction) await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
            }

            let targetStatus = req.body.estado || req.body.Estado || '';
            if (typeof targetStatus === 'object') targetStatus = targetStatus.nombre || targetStatus.Nombre || '';
            
            const rawStatus = String(targetStatus).toUpperCase();
            let newStatus = 'Pendiente';
            if (rawStatus.includes('APROB') || rawStatus.includes('COMPLET')) newStatus = 'Completada';
            else if (rawStatus.includes('RECHAZ')) newStatus = 'Rechazada';

            if (newStatus === 'Completada' && dev.idEstado !== 'Completada') {
                await decreaseProductStock(dev, transaction);
            }

            // 🔄 PROPAGAR CAMBIOS A TODA LA VENTA SI EXISTE
            if (dev.noVenta) {
                const siblings = await Devolucion.findAll({ 
                    where: { noVenta: dev.noVenta, id: { [Op.ne]: dev.id } },
                    transaction 
                });

                for (const sib of siblings) {
                    if (newStatus === 'Completada' && sib.idEstado !== 'Completada') {
                        await decreaseProductStock(sib, transaction);
                    }
                    await sib.update({ 
                        idEstado: newStatus,
                        observacion: req.body.motivoRechazo || req.body.observacion || dev.observacion
                    }, { transaction });
                }
            }

            await dev.update({ 
                idEstado: newStatus,
                observacion: req.body.motivoRechazo || req.body.observacion || dev.observacion
            }, { transaction });

            await transaction.commit();
            res.json({ success: true, message: dev.noVenta ? 'Solicitud actualizada correctamente' : 'Actualizado correctamente' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteDevolucion: async (req, res) => {
        try {
            await Devolucion.destroy({ where: { id: req.params.id } });
            res.json({ success: true, message: 'Eliminada' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    toggleDevolucionStatus: async (req, res) => {
        try {
            const dev = await Devolucion.findByPk(req.params.id);
            if (dev) {
                await dev.update({ isActive: !dev.isActive });
                res.json({ success: true, message: 'Estado cambiado' });
            }
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    getMisDevoluciones: async (req, res) => {
        try {
            const cliente = await Cliente.findOne({ where: { email: req.usuario.email } });
            if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

            const ventas = await Venta.findAll({ where: { idCliente: cliente.id }, attributes: ['id'] });
            const ventaIds = ventas.map(v => v.id);

            if (ventaIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            const data = await Devolucion.findAll({
                where: { idVenta: { [Op.in]: ventaIds } },
                include: [
                    {
                        model: Venta,
                        as: 'ventaOriginal',
                        attributes: ['id'],
                        include: [
                            {
                                model: DetalleVenta,
                                as: 'detalles',
                                attributes: ['idProducto', 'talla', 'cantidad']
                            }
                        ]
                    },
                    {
                        model: Producto,
                        as: 'productoInfo',
                        attributes: ['id', 'nombre', 'imagenes'],
                        paranoid: false
                    }
                ],
                order: [['fecha', 'DESC']]
            });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};

export default devolucionController;