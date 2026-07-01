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
                    { model: Proveedor, as: 'proveedorData', attributes: ['id', 'companyName', 'email'] },
                    { 
                        model: DetalleCompra, 
                        as: 'detalles', 
                        include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'], paranoid: false }] 
                    }
                ]
            });

            const rowsFormateadas = comprasRows.map(compra => {
                const json = compra.toJSON();
                // 🛡️ Fallback para proveedor borrado
                if (!json.proveedorData) {
                    json.proveedorData = {
                        id: null,
                        companyName: 'Proveedor',
                        email: 'Proveedor Eliminado',
                        isDeleted: true
                    };
                }
                return json;
            });

            res.json({ 
                success: true, 
                data: rowsFormateadas, 
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
            
            const json = compra.toJSON();
            // 🛡️ Fallback para proveedor borrado
            if (!json.proveedorData) {
                json.proveedorData = {
                    id: null,
                    companyName: 'Proveedor',
                    email: 'Proveedor Eliminado',
                    isDeleted: true
                };
            }
            res.json({ success: true, data: json });
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
            // Extraer datos del cuerpo de la petición
            const { idProveedor, nfactura, fecha, metodoPago, productos = [] } = req.body;

            // Validar que la compra contenga productos
            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                throw new Error('Debe agregar al menos un producto a la compra.');
            }

// -------------------
// VALIDACIÓN DE FECHA (ajuste automático)
// -------------------
const now = new Date(); // fecha actual para comparación
let fechaValida = new Date(); // valor por defecto = ahora
if (fecha) {
  const parsed = new Date(fecha);
  if (!isNaN(parsed.getTime())) {
    if (parsed <= now) {
      fechaValida = parsed; // fecha válida y no futura
    } else {
      console.warn('⚠️ Fecha de compra futura detectada, se ajusta a la fecha actual');
      // fechaValida permanece como ahora
    }
  } else {
    console.warn('⚠️ Formato de fecha inválido, se usa la fecha actual');
  }
} else {
  console.warn('⚠️ Fecha no proporcionada, se usa la fecha actual');
}
            // -------------------
            // VALIDACIÓN DE PRECIOS
            // -------------------
            const MAX_PRECIO = 99999999.99;
            const validarPrecio = (valor, nombre) => {
                if (valor == null) return valor;
                const num = parseFloat(valor);
                if (isNaN(num)) return valor;
                if (num > MAX_PRECIO) {
                    console.warn(`⚠️ ${nombre} excede el límite máximo (${MAX_PRECIO}). Se ajusta a ${MAX_PRECIO}`);
                    return MAX_PRECIO;
                }
                return num;
            };
            // Duplicated validation removed

            let totalCompra = 0;
            const detallesFinales = [];

            for (const item of productos) {
                const productId = item.idProducto || item.id;
                
                // Procesar variantes (tallas y cantidades)
                const variantes = item.variantes || [];
                const totalCantidadItem = variantes.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);

                // Validar precios antes de usarlos (DECIMAL 10,2 = máx 99999999.99)
                const precioCompraValido    = validarPrecio(item.precioCompra,    'PrecioCompra');
                const precioVentaValido     = validarPrecio(item.precioVenta,     'PrecioVenta');
                const precioMay6Valido      = validarPrecio(item.precioMayorista6,  'PrecioMayorista6');
                const precioMay80Valido     = validarPrecio(item.precioMayorista80, 'PrecioMayorista80');

                const subtotalItem = totalCantidadItem * (parseFloat(precioCompraValido) || 0);
                const subtotalValido = validarPrecio(subtotalItem, 'Subtotal');
                totalCompra += subtotalItem;

                detallesFinales.push({
                    idProducto: productId,
                    nombreProducto: item.nombre || item.nombreProducto,
                    variantes: variantes,
                    cantidad: totalCantidadItem,
                    precioCompra: precioCompraValido,
                    precioVenta: precioVentaValido,
                    precioMayorista6: precioMay6Valido,
                    precioMayorista80: precioMay80Valido,
                    subtotal: subtotalValido,
                    nFactura: nfactura
                });

                // Buscar o crear el producto
                let producto = null;
                if (productId) {
                    producto = await Producto.findByPk(productId, { transaction });
                }

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
                    
                    // Validar precios antes de actualizar el producto
                    const precioVentaValido = validarPrecio(item.precioVenta, 'PrecioVenta');
                    const precioMayorista6Valido = validarPrecio(item.precioMayorista6, 'PrecioMayorista6');
                    const precioMayorista80Valido = validarPrecio(item.precioMayorista80, 'PrecioMayorista80');
                    await producto.update({
                        tallasStock,
                        stock: nuevoStockGlobal,
                        precioVenta: precioVentaValido !== undefined ? precioVentaValido : producto.precioVenta,
                        precioMayorista6: precioMayorista6Valido !== undefined ? precioMayorista6Valido : producto.precioMayorista6,
                        precioMayorista80: precioMayorista80Valido !== undefined ? precioMayorista80Valido : producto.precioMayorista80
                    }, { transaction });
                } else {
                    // EL PRODUCTO NO EXISTE (ES NUEVO DESDE COMPRAS)
                    const tallasStock = variantes.map(v => ({
                        talla: v.talla,
                        cantidad: parseInt(v.cantidad) || 0
                    }));
                    const nuevoStockGlobal = tallasStock.reduce((sum, s) => sum + s.cantidad, 0);

                    const precioVentaValido = validarPrecio(item.precioVenta, 'PrecioVenta');
                    const precioMayorista6Valido = validarPrecio(item.precioMayorista6, 'PrecioMayorista6');
                    const precioMayorista80Valido = validarPrecio(item.precioMayorista80, 'PrecioMayorista80');

                    producto = await Producto.create({
                        nombre: item.nombre || item.nombreProducto,
                        descripcion: 'Producto registrado automáticamente desde Compras',
                        idCategoria: 1, // Categoría por defecto
                        precioCompra: parseFloat(precioCompraValido) || 0,
                        precioVenta: parseFloat(precioVentaValido) || 0,
                        precioMayorista6: parseFloat(precioMayorista6Valido) || 0,
                        precioMayorista80: parseFloat(precioMayorista80Valido) || 0,
                        stock: nuevoStockGlobal,
                        tallasStock: tallasStock,
                        isActive: false  // Inactivo hasta que se le agreguen imágenes y detalles
                    }, { transaction });

                    // Actualizar el detalle con el ID del producto recién creado
                    detallesFinales[detallesFinales.length - 1].idProducto = producto.id;
                }
            }

            const totalCompraValido = validarPrecio(totalCompra, 'Total Compra');

            const nuevaCompra = await Compra.create({
                idProveedor: idProveedor || null,
                nfactura,
                fecha: fechaValida,
                fechaRegistro: new Date(),
                total: totalCompraValido,
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

            const jsonResultado = resultado.toJSON();
            // 🛡️ Fallback para proveedor borrado
            if (!jsonResultado.proveedorData) {
                jsonResultado.proveedorData = {
                    id: null,
                    companyName: 'Proveedor',
                    email: 'Proveedor Eliminado',
                    isDeleted: true
                };
            }

            res.status(201).json({ success: true, data: jsonResultado });
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
    },
    recalcularStock: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            // 1. Obtener todos los productos activos
            const productos = await Producto.findAll({ transaction });

            // 2. Para cada producto, reconstruir tallasStock desde cero
            let productosActualizados = 0;

            for (const producto of productos) {
                // Obtener todos los detalles de compras Completadas para este producto
                const detalles = await DetalleCompra.findAll({
                    where: { idProducto: producto.id },
                    include: [{
                        model: Compra,
                        as: 'compra',
                        where: { estado: 'Completada' },
                        attributes: ['id', 'estado']
                    }],
                    transaction
                });

                if (detalles.length === 0) continue;

                // Acumular cantidades por talla desde todas las compras completadas
                const tallasMap = {};
                for (const detalle of detalles) {
                    const variantes = detalle.variantes || [];
                    for (const v of variantes) {
                        const tallaKey = String(v.talla || '').toUpperCase().trim();
                        if (!tallaKey) continue;
                        tallasMap[tallaKey] = (tallasMap[tallaKey] || 0) + (parseInt(v.cantidad) || 0);
                    }
                }

                // Convertir el mapa a array con el formato original de la talla
                // Usar el nombre de talla tal como viene del detalle (no en mayúsculas)
                const tallasMapOriginal = {};
                for (const detalle of detalles) {
                    const variantes = detalle.variantes || [];
                    for (const v of variantes) {
                        const tallaKey = String(v.talla || '').toUpperCase().trim();
                        if (!tallaKey) continue;
                        if (!tallasMapOriginal[tallaKey]) {
                            tallasMapOriginal[tallaKey] = { talla: v.talla, cantidad: 0 };
                        }
                        tallasMapOriginal[tallaKey].cantidad += (parseInt(v.cantidad) || 0);
                    }
                }

                const nuevasTallasStock = Object.values(tallasMapOriginal);
                const nuevoStockGlobal = nuevasTallasStock.reduce((sum, t) => sum + (t.cantidad || 0), 0);

                await producto.update({
                    tallasStock: nuevasTallasStock,
                    stock: nuevoStockGlobal
                }, { transaction });

                productosActualizados++;
            }

            await transaction.commit();
            res.json({
                success: true,
                message: `Stock recalculado correctamente. ${productosActualizados} productos actualizados.`,
                data: { productosActualizados }
            });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Error en recalcularStock:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default compraController;
