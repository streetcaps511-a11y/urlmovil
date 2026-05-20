// utils/validators/productos.validator.js
const { Op } = require('sequelize');
const Producto = require('../../models/Producto');
const Categoria = require('../../models/Categoria');

/**
 * Validador específico para productos
 */

const validateProductoData = async (data, id = null) => {
    const errors = [];

    // Validar Nombre
    if (data.Nombre !== undefined) {
        if (!data.Nombre || data.Nombre.length < 3) {
            errors.push('El nombre debe tener al menos 3 caracteres');
        } else {
            const whereClause = { Nombre: { [Op.like]: data.Nombre.trim() } };
            if (id) whereClause.IdProducto = { [Op.ne]: id };
            
            const existe = await Producto.findOne({ where: whereClause });
            if (existe) errors.push('Ya existe un producto con ese nombre');
        }
    }

    // Validar Precios
    if (data.Precio !== undefined && data.Precio < 0) {
        errors.push('El precio no puede ser negativo');
    }

    if (data.PrecioVenta !== undefined) {
        if (data.PrecioVenta < 0) {
            errors.push('El precio de venta no puede ser negativo');
        } else if (data.Precio && data.PrecioVenta < data.Precio) {
            errors.push('El precio de venta no puede ser menor al precio de compra');
        }
    }

    // Validar Stock
    if (data.Stock !== undefined && data.Stock < 0) {
        errors.push('El stock no puede ser negativo');
    }

    // Validar Categoría
    if (data.IdCategoria) {
        const categoria = await Categoria.findByPk(data.IdCategoria);
        if (!categoria) {
            errors.push('La categoría seleccionada no existe');
        } else if (!categoria.Estado) {
            errors.push('La categoría está inactiva');
        }
    }

    return errors;
};

const sanitizeProductoData = (data) => {
    const sanitized = {};
    
    if (data.Nombre) sanitized.Nombre = data.Nombre.trim().replace(/\s+/g, ' ');
    if (data.Descripcion) sanitized.Descripcion = data.Descripcion.trim();
    if (data.url) sanitized.url = data.url.trim();
    if (data.Stock !== undefined) sanitized.Stock = Number(data.Stock);
    if (data.Precio !== undefined) sanitized.Precio = Number(data.Precio);
    if (data.PrecioVenta !== undefined) sanitized.PrecioVenta = Number(data.PrecioVenta);
    if (data.IdCategoria) sanitized.IdCategoria = Number(data.IdCategoria);
    if (data.IdTallas) sanitized.IdTallas = Number(data.IdTallas);
    
    return sanitized;
};

module.exports = {
    validateProductoData,
    sanitizeProductoData
};