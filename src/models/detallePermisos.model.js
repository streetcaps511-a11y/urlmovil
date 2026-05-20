// models/detallePermisos.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Detalle de Permisos
 * Relaciona roles con permisos
 */
const DetallePermiso = sequelize.define('DetallePermiso', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDetalle'
    },
    idRol: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdRol'
    },
    idPermiso: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'IdPermiso'
    }
}, {
    tableName: 'DetallePermisos',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['IdRol', 'IdPermiso']
        }
    ]
});

export default DetallePermiso;