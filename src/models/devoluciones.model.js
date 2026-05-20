import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Devoluciones
 * Gestiona garantías, cambios y devoluciones de productos
 */
const Devolucion = sequelize.define('Devolucion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDevolucion'
    },
    idProducto: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdProducto'
    },
    idProductoCambio: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdProductoCambio'
    },
    idVenta: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdVenta'
    },
    idEstado: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'IdEstado',
        defaultValue: 'Pendiente'
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'Cantidad'
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'Valor'
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: 'Fecha'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
        field: 'Estado'
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Motivo'
    },
    observacion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Observacion'
    },
    tipoDocumento: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'TipoDocumento'
    },
    numeroDocumento: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'NumeroDocumento'
    },
    productoOriginal: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ProductoOriginal'
    },
    productoCambio: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ProductoCambio'
    },
    evidencia: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Evidencia'
    },
    evidencia2: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Evidencia2'
    },
    nombreCliente: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NombreCliente'
    },
    talla: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'Talla'
    },
    mismoModelo: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        field: 'mismoModelo'
    },
    pedidoCompleto: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        field: 'pedidoCompleto'
    },
    noVenta: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'NoVenta'
    },
    idLote: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'idLote'
    },
    noDevolucion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'NoDevolucion'
    }
}, {
    tableName: 'Devoluciones',
    timestamps: false
});

export default Devolucion;