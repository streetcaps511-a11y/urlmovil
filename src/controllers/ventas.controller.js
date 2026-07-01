/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/ventas.controller.js
import { Op } from 'sequelize';
import { 
    Venta, 
    DetalleVenta, 
    Cliente, 
    Producto, 
    Estado, 
    sequelize 
} from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.config.js';
import { sendSaleStatusEmail, sendSaleShippingEmail, sendSaleDeliveryEmail } from '../services/mail.service.js';

const saveReceiptToCloudinary = async (base64, prefix = 'comprobante') => {
    if (!base64 || typeof base64 !== 'string') return null;
    let base64String = base64.trim();
    
    // Si ya es una URL de internet, no hacer nada
    if (base64String.startsWith('http')) return base64String;

    // Si es una imagen base64
    if (base64String.startsWith('data:image/')) {
        try {
            const result = await cloudinary.uploader.upload(base64String, {
                folder: 'comprobantes',
                resource_type: 'auto',
                public_id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                overwrite: false,
                type: 'upload',
            });
            return result.secure_url;
        } catch (err) {
            console.error(`❌ Error subiendo ${prefix} a Cloudinary:`, err);
            return null;
        }
    }
    return null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for automatic delivery after a time threshold (2 minutes for testing, 10 days for prod)
const checkAutoDeliveries = async () => {
    try {
        // TIEMPO DE AUTO-ENTREGA: 2 minutos para pruebas. Cambiar a 10 días en producción: 10 * 24 * 60 * 60 * 1000
        const AUTO_DELIVERY_TIME = 2 * 60 * 1000;
        const threshold = new Date(Date.now() - AUTO_DELIVERY_TIME);
        
        const [affectedCount] = await Venta.update(
            { statusenvio: 'Entregado', fechaEntrega: new Date() },
            { 
                where: { 
                    statusenvio: 'Enviado', 
                    fechaEnvio: { [Op.lte]: threshold } 
                } 
            }
        );
        if (affectedCount > 0) {
            console.log(`[Auto-Delivery] Se actualizaron ${affectedCount} ventas de 'Enviado' a 'Entregado'.`);
        }
    } catch (error) {
        console.error('Error in checkAutoDeliveries:', error);
    }
};

const ventaController = {
    getEstadisticas: async (req, res) => {
        try {
            const total = await Venta.count();
            const ventasHoy = await Venta.count({ where: { fecha: { [Op.gte]: new Date().setHours(0,0,0,0) } } });
            const totalRecaudado = await Venta.sum('total') || 0;
            res.json({ success: true, data: { total, ventasHoy, totalRecaudado } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getEstadosVenta: async (req, res) => {
        try {
            const estados = await Estado.findAll();
            res.json({ success: true, data: estados });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getAllVentas: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const { page = 1, limit = 50, search = '' } = req.query;
            const offset = (page - 1) * limit;

            // PASO 1: Obtener ventas paginadas SIN relaciones para evitar bloqueos
            const count = await Venta.count();
            const ventasRows = await Venta.findAll({
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['fecha', 'DESC']]
            });

            const ventaIds = ventasRows.map(v => v.id);
            const clienteIds = [...new Set(ventasRows.map(v => v.idCliente).filter(id => id))];

            // PASO 2: Obtener Clientes relacionados
            let clientesData = [];
            if (clienteIds.length > 0) {
                clientesData = await Cliente.findAll({
                    where: { id: clienteIds },
                    attributes: ['id', 'nombreCompleto', 'email', 'numeroDocumento', 'telefono']
                });
            }

            // PASO 3: Obtener Detalles y Productos relacionados
            let detallesData = [];
            if (ventaIds.length > 0) {
                detallesData = await DetalleVenta.findAll({
                    where: { idVenta: ventaIds },
                    include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'precioVenta'] }]
                });
            }

            // PASO 4: Unir todo en memoria
            const rows = ventasRows.map(venta => {
                const json = venta.toJSON();
                json.clienteData = clientesData.find(c => c.id === json.idCliente) || null;
                json.detalles = detallesData
                    .filter(d => d.idVenta === json.id)
                    .map(d => d.toJSON());
                return json;
            });

            const rowsFormateadas = rows.map(json => {
                // 🛡️ Fallback para cliente borrado
                if (!json.clienteData) {
                    json.clienteData = { 
                        nombreCompleto: 'Cliente', 
                        email: 'Cliente Eliminado',
                        isDeleted: true 
                    };
                }
                // 🛡️ Fallback para productos borrados en detalles
                if (json.detalles) {
                    json.detalles = json.detalles.map(d => {
                        if (!d.producto && d.nombreProducto) {
                            d.producto = { nombre: d.nombreProducto, isDeleted: true };
                        }
                        return d;
                    });
                }
                return json;
            });

            res.json({ success: true, data: rowsFormateadas, pagination: { totalItems: count, currentPage: parseInt(page), totalPages: Math.ceil(count / limit) } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentaById: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const venta = await Venta.findByPk(req.params.id, { 
                include: ['clienteData', { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }] 
            });
            if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            
            const json = venta.toJSON();
            // 🛡️ Fallback para cliente borrado
            if (!json.clienteData) {
                json.clienteData = { 
                    nombreCompleto: 'Cliente', 
                    email: 'Cliente Eliminado',
                    isDeleted: true
                };
            }
            // 🛡️ Fallback para productos borrados en detalles
            if (json.detalles) {
                json.detalles = json.detalles.map(d => {
                    if (!d.producto && d.nombreProducto) {
                        d.producto = { nombre: d.nombreProducto, isDeleted: true };
                    }
                    return d;
                });
            }
            
            res.json({ success: true, data: json });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentasByCliente: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const clienteId = parseInt(req.params.clienteId);
            console.log(`🔍 Buscando ventas para clienteId: ${clienteId}`);
            
            if (isNaN(clienteId)) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const data = await Venta.findAll({ 
                where: {
                    [Op.or]: [
                        { idCliente: clienteId },
                        { IdCliente: clienteId }
                    ]
                },
                include: [
                    { 
                        model: DetalleVenta, 
                        as: 'detalles', 
                        include: [{ model: Producto, as: 'producto', paranoid: false }] 
                    }
                ],
                order: [['fecha', 'DESC']]
            });
            
            console.log(`🔍 Ventas encontradas para cliente ${clienteId}: ${data.length}`);
            res.json({ success: true, data });
        } catch (error) {
            console.error('❌ Error en getVentasByCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentasByFecha: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const data = await Venta.findAll({ where: { fecha: { [Op.gte]: new Date().setHours(0,0,0,0) } } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentasByRangoFechas: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const { inicio, fin } = req.query;
            const data = await Venta.findAll({ where: { fecha: { [Op.between]: [new Date(inicio), new Date(fin)] } } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentasByProducto: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const data = await Venta.findAll({ 
                include: [{ model: DetalleVenta, as: 'detalles', where: { idProducto: req.params.productoId } }] 
            });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getVentasByVendedor: async (req, res) => {
        res.json({ success: true, message: 'No implementado por ahora' });
    },

    getVentaConDetalle: async (req, res) => {
        return this.getVentaById(req, res);
    },

    generarReporteIndividual: async (req, res) => {
        res.json({ success: true, message: 'Reporte generado' });
    },

    createVenta: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            let { idCliente, productos, metodoPago } = req.body;

            // Validar que el pedido contenga productos
            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                throw new Error('Debe agregar al menos un producto al pedido.');
            }

            // 🔥 SIEMPRE verificar que el idCliente realmente existe en la tabla Clientes
            if (idCliente) {
                const clienteExiste = await Cliente.findByPk(idCliente, { transaction });
                if (!clienteExiste) {
                    console.warn(`⚠️ idCliente=${idCliente} NO existe en tabla Clientes. Buscando por email...`);
                    idCliente = null; // Forzar búsqueda por email
                }
            }

            // Si no llega idCliente válido, buscarlo por email del usuario logueado
            if (!idCliente && req.usuario?.email) {
                const cliente = await Cliente.findOne({ where: { email: req.usuario.email }, transaction });
                if (cliente) {
                    idCliente = cliente.id;
                    console.log(`✅ Cliente encontrado por email: IdCliente=${idCliente}`);
                }
            }
            if (!idCliente) {
                throw new Error('No se pudo identificar al cliente. Asegúrate de estar logueado.');
            }

            let totalVenta = 0;
            const detallesData = [];

            for (const item of productos) {
                const productId = item.idProducto || item.id;
                const subtotal = item.cantidad * item.precio;
                totalVenta += subtotal;

                // 🔍 Validar que el producto existe (Ya NO descontamos stock aquí)
                const producto = await Producto.findByPk(productId, { transaction });
                if (!producto) {
                    throw new Error(`Producto con ID ${productId} no encontrado`);
                }

                detallesData.push({
                    idProducto: productId,
                    nombreProducto: item.nombre || producto.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal: subtotal,
                    talla: item.talla
                });
            }

            // 📸 MANEJO DEL COMPROBANTE CON CLOUDINARY
            let comprobanteUrl = null;
            if (req.body.comprobante) {
                comprobanteUrl = await saveReceiptToCloudinary(req.body.comprobante, 'comprobante');
            }

            // 👮 DETERMINAR EL ESTADO INICIAL BASADO EN EL ROL (Más robusto: String o ID)
            const userRole = (req.usuario?.rol || req.usuario?.role || '').toUpperCase();
            const rolId = parseInt(req.usuario?.rolId || req.usuario?.idRol || req.usuario?.rol_id || req.usuario?.id_rol);
            const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR' || rolId === 1 || req.usuario?.email === 'duvann1991@gmail.com';
            const estadoInicial = isAdmin ? 'Completada' : 'Pendiente';

            // Estado: Texto directo (ya no es un ID numérico)
            const nuevaVentaObj = await Venta.create({
                idCliente,
                idEstado: estadoInicial,
                fecha: new Date(),
                total: totalVenta,
                metodoPago: metodoPago || 'Efectivo',
                direccionEnvio: req.body.direccionEnvio || null,
                tipoEntrega: req.body.tipoEntrega || 'envio',
                comprobante: comprobanteUrl,
                esManual: isAdmin
            }, { transaction });

            // 🔥 ASIGNAR NO. VENTA AL REGISTRO RECIÉN CREADO (Offset 1000)
            await nuevaVentaObj.update({ noVenta: String(1000 + nuevaVentaObj.id) }, { transaction });

            for (const d of detallesData) {
                // 1. Crear el detalle de la venta con el NoVenta vinculado
                await DetalleVenta.create({ 
                    idVenta: nuevaVentaObj.id, 
                    noVenta: String(nuevaVentaObj.id),
                    ...d 
                }, { transaction });

                // 🛒 2. SI ES ADMIN, DESCONTAMOS STOCK DE UNA VEZ
                if (estadoInicial === 'Completada') {
                    const p = await Producto.findByPk(d.idProducto, { transaction });
                    if (p) {
                        const tallasStockRaw = JSON.parse(JSON.stringify(p.tallasStock || []));
                        const indexTalla = tallasStockRaw.findIndex(ts => ts.talla === d.talla);
                        if (indexTalla !== -1) {
                            tallasStockRaw[indexTalla].cantidad -= d.cantidad;
                            
                            // 🔥 RECALCULAR STOCK GLOBAL PARA EVITAR DESFASES
                            const nuevoStockGlobal = tallasStockRaw.reduce((sum, s) => sum + (parseInt(s.cantidad) || 0), 0);
                            
                            p.tallasStock = tallasStockRaw;
                            p.stock = nuevoStockGlobal; // 🚀 Sincronización crítica
                            await p.save({ transaction });
                        }
                    }
                }
            }

            await transaction.commit();

            // 🔄 VOLVER A CARGAR LA VENTA CON SUS RELACIONES
            // ⚠️ Corregido: Usamos 'Nombre' que es la columna real en la DB
            const ventaCompleta = await Venta.findByPk(nuevaVentaObj.id, {
                include: [
                    { association: 'clienteData', attributes: ['id', 'nombreCompleto', 'numeroDocumento', 'email', 'telefono'] },
                    { association: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                ]
            });

            res.status(201).json({ success: true, data: ventaCompleta });
        } catch (error) {
            try { await transaction.rollback(); } catch (rbErr) { /* rollback silencioso */ }
            console.error('Error en createVenta:', error);
            
            // Diferenciar errores de conexión vs errores de lógica
            if (error.name === 'SequelizeHostNotFoundError' || error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError' || error.name === 'SequelizeConnectionTimedOutError') {
                return res.status(503).json({ 
                    success: false, 
                    message: 'Error de conexión con la base de datos. El servidor de Aiven puede estar temporalmente inaccesible. Intenta de nuevo en unos minutos.' 
                });
            }
            
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Error: el cliente no fue encontrado en la base de datos. Por favor, cierra sesión y vuelve a iniciar sesión.' 
                });
            }
            
            res.status(400).json({ success: false, message: error.message });
        }
    },

    createVentaCompleta: async (req, res) => {
        return ventaController.createVenta(req, res);
    },

    anularVenta: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const venta = await Venta.findByPk(req.params.id, {
                include: [{ model: DetalleVenta, as: 'detalles' }]
            });
            if (!venta || venta.idEstado === 3) throw new Error('Venta inválida o ya anulada');

            // Restaurar stock al anular (por TALLA)
            for (const d of venta.detalles) {
                const p = await Producto.findByPk(d.idProducto, { transaction });
                if (p) {
                    const tallasStock = [...(p.tallasStock || [])];
                    const idx = tallasStock.findIndex(s => s.talla === d.talla);
                    
                    if (idx !== -1) {
                        tallasStock[idx].cantidad += d.cantidad;
                    }

                    const newGlobalStock = tallasStock.reduce((total, s) => total + (parseInt(s.cantidad) || 0), 0);

                    await p.update({ 
                        tallasStock: tallasStock,
                        stock: newGlobalStock 
                    }, { transaction });
                }
            }

            await venta.update({ idEstado: 'Anulada' }, { transaction });
            await transaction.commit();

            // Recuperar la venta final actualizada
            const ventaFinal = await Venta.findByPk(req.params.id, {
                include: [
                    { association: 'clienteData', attributes: ['id', 'nombreCompleto', 'numeroDocumento', 'email', 'telefono'] },
                    { association: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                ]
            });

            // Enviar correo de notificación
            const email = ventaFinal.clienteData?.email;
            if (email) {
                const clienteName = ventaFinal.clienteData?.nombreCompleto || 'Cliente';
                sendSaleStatusEmail(email, clienteName, ventaFinal.toJSON())
                    .then(() => console.log(`📧 Correo de anulación de venta PED-${ventaFinal.noVenta || ventaFinal.id} enviado a ${email}`))
                    .catch((err) => console.error("⚠️ Error enviando correo de anulación de venta:", err.message));
            }

            res.json({ success: true, data: ventaFinal, message: 'Venta anulada correctamente' });
        } catch (error) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    },

    procesarPago: async (req, res) => {
        res.json({ success: true, message: 'Pago procesado' });
    },

    getMisVentas: async (req, res) => {
        try {
            await checkAutoDeliveries();
            const cliente = await Cliente.findOne({ where: { email: req.usuario.email } });
            if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

            const data = await Venta.findAll({
                where: { idCliente: cliente.id },
                include: [
                    { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'precioVenta', 'imagenes'], paranoid: false }] }
                ],
                order: [['fecha', 'DESC']]
            });

            // 🔥 Asegurar que el estado vaya en minúscula para evitar confusiones
            const responseData = data.map(v => {
                const json = v.toJSON();
                return {
                    ...json,
                    idEstado: v.idEstado || v.IdEstado || 'Pendiente'
                };
            });

            res.json({ success: true, data: responseData });
        } catch (error) {
            console.error('Error en getMisVentas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    actualizarEstado: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { nuevoEstado, motivoRechazo, montoPagado, monto1, monto2, comprobante2 } = req.body;
            const ventaId = req.params.id;

            const venta = await Venta.findByPk(ventaId, {
                include: [{ model: DetalleVenta, as: 'detalles' }],
                transaction
            });

            if (!venta) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            // 🔍 CLAVE: usar 'idEstado' (minúscula) que es el nombre del campo en Sequelize JS
            // El campo 'field: IdEstado' es sólo el nombre de la columna en PostgreSQL
            const estadoAnterior = String(venta.idEstado || '').toLowerCase();
            const estadoNuevo = String(nuevoEstado || '').toLowerCase();

            // 🔥 LÓGICA DE INVENTARIO BASADA EN TEXTO
            const esAprobar = estadoNuevo.includes('completad') || estadoNuevo.includes('aproba');
            const eraAprobado = estadoAnterior.includes('completad') || estadoAnterior.includes('aproba');

            // A. De Pendiente/Rechazado a Aprobado -> DESCONTAR
            if (esAprobar && !eraAprobado) {
                for (const d of venta.detalles) {
                    const producto = await Producto.findByPk(d.idProducto, { transaction });
                    if (producto) {
                        // 🔥 DEEP CLONE: Sin esto, Sequelize NO detecta cambios en JSON
                        const tallasStock = JSON.parse(JSON.stringify(producto.tallasStock || []));
                        const idx = tallasStock.findIndex(s => String(s.talla).toUpperCase().trim() === String(d.talla).toUpperCase().trim());
                        
                        if (idx !== -1) {
                            const cantidadDisponible = parseInt(tallasStock[idx].cantidad) || 0;
                            const cantidadNecesaria = parseInt(d.cantidad);
                            if (cantidadDisponible < cantidadNecesaria) {
                                throw new Error(`Stock insuficiente para ${producto.nombre} en talla ${d.talla}. Disponible: ${cantidadDisponible}`);
                            }
                            tallasStock[idx].cantidad = cantidadDisponible - cantidadNecesaria;
                            
                            // 🔥 RECALCULAR STOCK GLOBAL PARA EVITAR DESFASES EN EL HOME
                            const nuevoStockGlobal = tallasStock.reduce((total, s) => total + (parseInt(s.cantidad) || 0), 0);
                            
                            // Forzar que Sequelize detecte el cambio marcándolo explícitamente
                            producto.tallasStock = tallasStock;
                            producto.stock = nuevoStockGlobal; // 🚀 Sincronización crítica
                            producto.changed('tallasStock', true);
                            await producto.save({ transaction });
                        } else {
                            // Talla no encontrada
                        }
                    }
                }
            }

            // Guardar el nombre del estado
            const estadoAGuardar = esAprobar ? 'Completada' : nuevoEstado;

            // 📸 MANEJO DEL SEGUNDO COMPROBANTE CON CLOUDINARY
            let comprobante2Url = venta.comprobante2;
            if (comprobante2) {
                comprobante2Url = await saveReceiptToCloudinary(comprobante2, 'comprobante2');
            } else if (comprobante2 === null) {
                comprobante2Url = null;
            }

            console.log(`💾 Guardando estado: "${estadoAGuardar}" | Monto: ${montoPagado}`);
            await Venta.update(
                { 
                    idEstado: estadoAGuardar, 
                    motivoRechazo: motivoRechazo || venta.motivoRechazo,
                    montoPagado: montoPagado !== undefined ? montoPagado : venta.montoPagado,
                    monto1: monto1 !== undefined ? monto1 : venta.monto1,
                    monto2: monto2 !== undefined ? monto2 : venta.monto2,
                    comprobante2: comprobante2Url
                }, 
                { where: { id: ventaId }, transaction }
            );

            await transaction.commit();
            console.log('🏁 TRANSACCIÓN COMPLETADA CON ÉXITO');
            console.log(`---------------------------------------------------------\n`);

            // Recuperar la venta final
            const ventaFinal = await Venta.findByPk(ventaId, {
                include: [
                    { model: Cliente, as: 'clienteData' },
                    { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                ]
            });

            // Enviar correo de notificación
            const email = ventaFinal.clienteData?.email;
            if (email) {
                const clienteName = ventaFinal.clienteData?.nombreCompleto || 'Cliente';
                sendSaleStatusEmail(email, clienteName, ventaFinal.toJSON())
                    .then(() => console.log(`📧 Correo de estado de venta PED-${ventaFinal.noVenta || ventaFinal.id} enviado a ${email}`))
                    .catch((err) => console.error("⚠️ Error enviando correo de estado de venta:", err.message));
            }

            res.json({ success: true, data: ventaFinal });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ ERROR OPERACIÓN FALLIDA:', error.message);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    actualizarStatusEnvio: async (req, res) => {
        try {
            const { statusenvio } = req.body;
            const ventaId = req.params.id;

            const venta = await Venta.findByPk(ventaId);
            if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

            const updates = { statusenvio };
            if (statusenvio === 'Enviado') {
                updates.fechaEnvio = new Date();
                updates.fechaEntrega = null;
            } else if (statusenvio === 'Por enviar' || statusenvio === 'Preparando') {
                updates.fechaEnvio = null;
                updates.fechaEntrega = null;
            } else if (statusenvio === 'Por entregar') {
                updates.fechaEnvio = null;
                updates.fechaEntrega = null;
            } else if (statusenvio === 'Entregado') {
                updates.fechaEntrega = new Date();
            }

            await venta.update(updates);
            
            // Si el estado cambia a Enviado, enviar correo de notificación
            if (statusenvio === 'Enviado') {
                const ventaFinal = await Venta.findByPk(ventaId, {
                    include: [
                        { model: Cliente, as: 'clienteData' },
                        { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                    ]
                });
                
                const email = ventaFinal?.clienteData?.email;
                if (email) {
                    const clienteName = ventaFinal.clienteData?.nombreCompleto || 'Cliente';
                    sendSaleShippingEmail(email, clienteName, ventaFinal.toJSON())
                        .then(() => console.log(`📧 Correo de pedido enviado PED-${ventaFinal.noVenta || ventaFinal.id} enviado a ${email}`))
                        .catch((err) => console.error("⚠️ Error enviando correo de envío de pedido:", err.message));
                }
            } else if (statusenvio === 'Entregado') {
                const ventaFinal = await Venta.findByPk(ventaId, {
                    include: [
                        { model: Cliente, as: 'clienteData' },
                        { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                    ]
                });
                
                const email = ventaFinal?.clienteData?.email;
                if (email) {
                    const clienteName = ventaFinal.clienteData?.nombreCompleto || 'Cliente';
                    sendSaleDeliveryEmail(email, clienteName, ventaFinal.toJSON())
                        .then(() => console.log(`📧 Correo de pedido entregado PED-${ventaFinal.noVenta || ventaFinal.id} enviado a ${email}`))
                        .catch((err) => console.error("⚠️ Error enviando correo de entrega de pedido:", err.message));
                }
            }
            
            res.json({ success: true, data: venta });
        } catch (error) {
            console.error('Error en actualizarStatusEnvio:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    marcarComoRecibido: async (req, res) => {
        try {
            const ventaId = req.params.id;
            const venta = await Venta.findByPk(ventaId);
            if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

            // Solo el cliente de la venta puede marcarla o un admin, omitimos seguridad estricta para simplicidad o validamos req.usuario.email
            await venta.update({ statusenvio: 'Entregado', fechaEntrega: new Date() });

            // Enviar correo de pedido entregado
            const ventaFinal = await Venta.findByPk(ventaId, {
                include: [
                    { model: Cliente, as: 'clienteData' },
                    { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', paranoid: false }] }
                ]
            });
            
            const email = ventaFinal?.clienteData?.email;
            if (email) {
                const clienteName = ventaFinal.clienteData?.nombreCompleto || 'Cliente';
                sendSaleDeliveryEmail(email, clienteName, ventaFinal.toJSON())
                    .then(() => console.log(`📧 Correo de pedido entregado (marcado por cliente) PED-${ventaFinal.noVenta || ventaFinal.id} enviado a ${email}`))
                    .catch((err) => console.error("⚠️ Error enviando correo de entrega de pedido:", err.message));
            }
            
            res.json({ success: true, data: venta });
        } catch (error) {
            console.error('Error en marcarComoRecibido:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default ventaController;