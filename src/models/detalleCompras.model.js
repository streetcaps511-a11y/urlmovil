import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CompraDetalle = sequelize.define('CompraDetalle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'IdDetalle'
    },
    idCompra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdCompra',
        references: {
            model: 'Compras',
            key: 'IdCompra'
        }
    },
    idProducto: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdProducto',
        comment: 'ID del producto en tabla Productos (opcional)'
    },
    nFactura: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'Nfactura',
        comment: 'Número de factura manual vinculado al detalle'
    },

    nombreProducto: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'NombreProducto'
    },

    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        field: 'Cantidad'
    },
    precioCompra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'PrecioCompra'
    },
    precioVenta: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'PrecioVenta'
    },
    precioMayorista6: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'PrecioMayorista6'
    },
    precioMayorista80: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'PrecioMayorista80'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'Subtotal',
        comment: 'Cantidad * PrecioCompra (calculado en backend)'
    },
    variantes: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Variantes',
        comment: 'JSON con las tallas y cantidades compradas: [{talla, cantidad}]',
        defaultValue: []
    },
}, {
    tableName: 'CompraDetalles',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

export default CompraDetalle;