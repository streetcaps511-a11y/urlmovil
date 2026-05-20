import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Productos
 * Gestiona el catálogo de productos con precios, stock, variantes y multimedia
 * @table Productos
 */
const Producto = sequelize.define('Producto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdProducto',
        comment: 'Identificador único del producto'
    },
    nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'Nombre',
        validate: {
            notEmpty: { msg: 'El nombre del producto es obligatorio' },
            len: { args: [3, 200], msg: 'El nombre debe tener entre 3 y 200 caracteres' }
        },
        comment: 'Nombre descriptivo del producto'
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'Categoria',
        comment: 'Categoría del producto (ej: BEISBOLERA PREMIUM, GORRA CLÁSICA)'
    },
    idCategoria: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdCategoria',
        references: {
            model: 'Categorias',
            key: 'IdCategoria'
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Descripcion',
        comment: 'Descripción detallada del producto'
    },
    precioCompra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'PrecioCompra',
        validate: { min: { args: [0], msg: 'El precio de compra no puede ser negativo' } },
        comment: 'Precio de costo del producto'
    },
    precioVenta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'PrecioVenta',
        validate: { min: { args: [0], msg: 'El precio de venta no puede ser negativo' } },
        comment: 'Precio regular de venta al público'
    },
    precioOferta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioOferta',
        validate: { min: { args: [0], msg: 'El precio de oferta no puede ser negativo' } },
        comment: 'Precio con descuento aplicado'
    },
    precioMayorista6: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioMayorista6',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
        comment: 'Precio mayorista para compras de 6+ unidades'
    },
    precioMayorista80: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioMayorista80',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
        comment: 'Precio mayorista para compras de 80+ unidades'
    },
    enOfertaVenta: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'EnOfertaVenta',
        comment: 'Indica si el producto tiene oferta activa'
    },
    porcentajeDescuento: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PorcentajeDescuento',
        validate: { min: 0, max: 100 },
        comment: 'Porcentaje de descuento aplicado (0-100)'
    },
    enInventario: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'EnInventario',
        comment: 'Indica si el producto se gestiona con inventario'
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'Stock',
        validate: { min: { args: [0], msg: 'El stock no puede ser negativo' } },
        comment: 'Cantidad total disponible en inventario'
    },
    tallasStock: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'TallasStock',
        comment: 'Array de nombres de tallas: ["M", "L", "XL"]',
        defaultValue: []
    },
    colores: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Colores',
        comment: 'Array de nombres de colores disponibles: ["Negro", "Blanco"]',
        defaultValue: []
    },
    imagenes: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Imagenes',
        comment: 'Array de URLs de imágenes del producto',
        defaultValue: [],
        validate: {
            isArrayUrl: (urls) => {
                if (Array.isArray(urls)) {
                    urls.forEach(url => {
                        if (url && !url.toString().startsWith('http')) {
                            throw new Error('Cada imagen debe ser una URL válida');
                        }
                    });
                }
            }
        }
    },
    destacado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'Destacado',
        comment: 'Indica si el producto aparece como destacado'
    },
    sales: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'Sales',
        comment: 'Número total de ventas registradas'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'IsActive',
        comment: 'Estado lógico: true=activo, false=inactivo'
    }
}, {
    tableName: 'Productos',
    timestamps: true, // Habilitar timestamps para permitir paranoid
    createdAt: false, // Deshabilitar createdAt porque no existe en la tabla física
    updatedAt: false, // Deshabilitar updatedAt porque no existe en la tabla física
    paranoid: true,   // Habilitar borrado lógico (Soft Delete)
    deletedAt: 'DeletedAt', // Mapear a la columna que acabamos de crear
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    hooks: {
        beforeCreate: (producto) => {
            if (producto.enOfertaVenta && producto.precioVenta && producto.precioOferta) {
                if (!producto.porcentajeDescuento) {
                    const descuento = ((producto.precioVenta - producto.precioOferta) / producto.precioVenta) * 100;
                    producto.porcentajeDescuento = Math.round(descuento);
                }
            }
            if (producto.enOfertaVenta && producto.precioVenta && producto.porcentajeDescuento && !producto.precioOferta) {
                const descuento = producto.precioVenta * (producto.porcentajeDescuento / 100);
                producto.precioOferta = producto.precioVenta - descuento;
            }

            // 🔥 CALCULAR STOCK TOTAL AUTOMÁTICAMENTE
            if (producto.tallasStock && Array.isArray(producto.tallasStock)) {
                producto.stock = producto.tallasStock.reduce((total, item) => total + (parseInt(item.cantidad) || 0), 0);
                console.log(`📊 Stock calculado para ${producto.nombre}: ${producto.stock}`);
            }

            console.log(`📦 Creando producto: ${producto.nombre}`);
        },
        beforeUpdate: (producto) => {
            if (producto.changed('enOfertaVenta') || producto.changed('precioVenta') || producto.changed('precioOferta')) {
                if (producto.enOfertaVenta && producto.precioVenta && producto.precioOferta) {
                    const descuento = ((producto.precioVenta - producto.precioOferta) / producto.precioVenta) * 100;
                    producto.porcentajeDescuento = Math.round(descuento);
                } else if (!producto.enOfertaVenta) {
                    producto.precioOferta = 0;
                    producto.porcentajeDescuento = null;
                }
            }

            // 🔥 RE-CALCULAR STOCK TOTAL AUTOMÁTICAMENTE AL EDITAR
            if (producto.tallasStock && Array.isArray(producto.tallasStock)) {
                producto.stock = producto.tallasStock.reduce((total, item) => total + (parseInt(item.cantidad) || 0), 0);
                console.log(`📊 Stock re-calculado para ${producto.nombre}: ${producto.stock}`);
            }

            console.log(`📦 Actualizando producto ID: ${producto.id}`);
        }
    }
});

Producto.prototype.formatearPrecio = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(this.precioVenta || 0);
};

Producto.prototype.formatearPrecioOferta = function() {
    if (!this.enOfertaVenta || !this.precioOferta) return null;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(this.precioOferta);
};

Producto.prototype.precioEfectivo = function() {
    return this.enOfertaVenta && this.precioOferta > 0 ? this.precioOferta : this.precioVenta;
};

Producto.prototype.stockBajo = function(limite = 10) {
    return (this.stock || 0) <= limite;
};

Producto.prototype.calcularStockTotal = function() {
    if (!this.tallasStock || !Array.isArray(this.tallasStock)) return this.stock || 0;
    return this.tallasStock.reduce((sum, t) => sum + (t.cantidad || 0), 0);
};

Producto.prototype.tieneImagenes = function() {
    return Array.isArray(this.imagenes) && this.imagenes.some(url => url?.trim());
};

Producto.prototype.getImagenPrincipal = function() {
    if (this.tieneImagenes()) {
        return this.imagenes.find(url => url?.trim()) || '/images/placeholder-product.png';
    }
    return '/images/placeholder-product.png';
};

export default Producto;