// models/detalleVentas.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Detalle de Ventas
 * Representa los productos incluidos en cada venta
 * @table DetalleVentas
 */
const DetalleVenta = sequelize.define('DetalleVenta', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDetalleVenta'
    },
    idVenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdVenta',
        references: {
            model: 'Ventas',
            key: 'IdVenta'
        }
    },
    idProducto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdProducto',
        references: {
            model: 'Productos',
            key: 'IdProducto'
        }
    },
    nombreProducto: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NombreProducto'
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: { args: [1], msg: 'La cantidad debe ser al menos 1' } },
        field: 'Cantidad'
    },
    talla: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'Talla',
        comment: 'Talla del producto vendido (ej: M, L, XL)'
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
        field: 'Precio'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'Subtotal'
    },
    noVenta: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'NoVenta',
        comment: 'Número de venta vinculado al detalle'
    }
}, {
    tableName: 'DetalleVentas',
    timestamps: false,
    hooks: {
        beforeCreate: (detalle) => {
            detalle.subtotal = detalle.cantidad * detalle.precio;
        },
        beforeUpdate: (detalle) => {
            detalle.subtotal = detalle.cantidad * detalle.precio;
        }
    }
});

export default DetalleVenta; 