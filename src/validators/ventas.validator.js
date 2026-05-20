// utils/validators/ventas.validator.js
const { Op } = require('sequelize');
const Cliente = require('../../models/Clientes');
const Producto = require('../../models/Producto');

/**
 * Validador específico para ventas
 */

const validateVentaData = async (data) => {
    const errors = [];

    // Validar Cliente
    if (!data.IdCliente) {
        errors.push('Debe seleccionar un cliente');
    } else {
        const cliente = await Cliente.findByPk(data.IdCliente);
        if (!cliente) {
            errors.push('El cliente seleccionado no existe');
        } else if (!cliente.Estado) {
            errors.push('El cliente está inactivo');
        }
    }

    // Validar Productos
    if (!data.productos || !Array.isArray(data.productos) || data.productos.length === 0) {
        errors.push('Debe incluir al menos un producto');
    } else {
        for (let i = 0; i < data.productos.length; i++) {
            const item = data.productos[i];
            
            if (!item.IdProducto) {
                errors.push(`Producto ${i+1}: debe seleccionar un producto`);
                continue;
            }
            
            if (!item.Cantidad || item.Cantidad <= 0) {
                errors.push(`Producto ${i+1}: la cantidad debe ser mayor a 0`);
            }
            
            // Verificar stock
            const producto = await Producto.findByPk(item.IdProducto);
            if (producto && item.Cantidad > producto.Stock) {
                errors.push(`Producto ${producto.Nombre}: stock insuficiente (disponible: ${producto.Stock})`);
            }
        }
    }

    // Validar Método de Pago
    if (data.MetodoPago) {
        const metodosValidos = ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito', 'Débito'];
        if (!metodosValidos.includes(data.MetodoPago)) {
            errors.push('Método de pago no válido');
        }
    }

    return errors;
};

const validateAnulacionVenta = (data) => {
    const errors = [];

    if (!data.motivo || data.motivo.trim() === '') {
        errors.push('Debe proporcionar un motivo de anulación');
    } else if (data.motivo.length < 5) {
        errors.push('El motivo debe tener al menos 5 caracteres');
    }

    return errors;
};

module.exports = {
    validateVentaData,
    validateAnulacionVenta
};